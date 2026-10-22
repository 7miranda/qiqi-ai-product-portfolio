"""Integration tests use real MySQL. No SQLite or mock substitution."""
import json, sys, tempfile, unittest, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts/crossbound-local'))
import server, mysql_db, pymysql
from mail_delivery import deliver

class CollectionTests(unittest.TestCase):
    def test_production_context_security_and_persistence(self):
        import io
        sys.path.insert(0,str(ROOT/'backend'))
        from app import create_app, verify_schema
        verify_schema(self.store)
        app=create_app(self.store,token='t'*40,origin='https://game.example.com',context='/crossbound')
        def request(path,method='GET',body=None,**extra):
            raw=json.dumps(body).encode() if body is not None else b''
            env={'PATH_INFO':path,'REQUEST_METHOD':method,'HTTP_HOST':'game.example.com','wsgi.input':io.BytesIO(raw),'CONTENT_LENGTH':str(len(raw)),'CONTENT_TYPE':'application/json',**extra}
            result=[]
            data=b''.join(app(env,lambda status,headers:result.append(status)))
            return int(result[0].split()[0]),data
        self.assertEqual(request('/api/health')[0],404)
        self.assertEqual(request('/crossbound/api/health')[0],200)
        self.assertEqual(request('/crossbound/api/admin/leads')[0],401)
        self.assertEqual(request('/crossbound/api/health',HTTP_HOST='evil.invalid')[0],403)
        self.assertEqual(request('/crossbound/api/records','POST',{},HTTP_ORIGIN='https://evil.invalid')[0],403)
        self.assertEqual(request('/crossbound/api/records','POST',{},CONTENT_LENGTH='2000001')[0],413)
        row=self.record('events','enter',event='game_enter')
        status,data=request('/crossbound/api/records','POST',{'records':[row]},HTTP_ORIGIN='https://game.example.com')
        self.assertEqual(status,200);self.assertEqual(json.loads(data)['accepted'],['test:enter'])
        self.assertEqual(len(self.store.rows('events')),1)
        self.assertEqual(request('/crossbound/api/admin/events',HTTP_X_ADMIN_TOKEN='t'*40)[0],200)
        status,page=request('/crossbound/admin');self.assertEqual(status,200)
        self.assertIn(b'/crossbound/api/admin/',page)
        self.assertNotIn(b"fetch('/api/admin/'",page)

    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.admin=mysql_db.config(ROOT/'.crossbound-local/mysql-admin.json')
        self.name='crossbound_test_'+uuid.uuid4().hex
        with mysql_db.connect(self.admin) as db: db.execute(f'CREATE DATABASE `{self.name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        self.settings=dict(self.admin,database=self.name)
        self.store=server.Store(self.settings,Path(self.temp.name))
    def tearDown(self):
        with mysql_db.connect(self.admin) as db: db.execute(f'DROP DATABASE `{self.name}`')
        self.temp.cleanup()
    def record(self,table,key,user='test',**data):
        return dict(type=table,id=user+':'+key,at='2026-10-22T12:00:00.000Z',data=dict(user_id=user,schema_version='2026-10-22',game_version='test-v2',**data))
    def rounds(self,user='test',count=3):
        rows=[self.record('round_reports',f'round:{i}',user,round=i,completed=True,exit_stage=6,orders=350,refunds=20,kept_orders=330,profit=1000,passed=True,decisions=[],market='singapore',product='tech',quantity=400,category='3C',price=45) for i in range(1,count+1)]
        self.assertEqual(len(self.store.ingest(rows)),count)
        return rows
    def lead(self,user='test',key='lead:1',score=50):
        a=dict(averageScore=score,rounds=3,title='探索者',profit_score=50,stability_score=50,breadth_score=50,knowledge_score=50)
        return self.record('leads',key,user,consent=True,consent_at='2026-10-22T12:00:00Z',email='private@example.com',wechat='wx-private',category='家居',followers='1千~1万',platform='抖音',policy_version='cooperation-v2',touchpoint='report',score=score,assessment=a,report_text='同一份报告：测试 🧭',tier='full')
    def test_schema_reopen_foreign_keys_and_aliases(self):
        self.rounds();server.Store(self.settings,Path(self.temp.name))
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM schema_migrations').fetchone()[0],4)
            row=db.execute('SELECT round_number,round_no,market,market_id,goal_met FROM round_reports LIMIT 1').fetchone()
            self.assertEqual(row[0],row[1]);self.assertEqual(row[2],row[3]);self.assertEqual(row[4],1)
            with self.assertRaises(pymysql.IntegrityError):db.execute("INSERT INTO events(id,user_id,data,updated_at) VALUES ('bad:id','missing','{}','now')")
    def test_retry_revision_and_invalid_numbers(self):
        rows=self.rounds();self.store.ingest(rows)
        self.assertEqual(len(self.store.rows('round_reports')),3)
        invalid=self.record('round_reports','round:4',round=4,completed=True,exit_stage=6,orders=100,refunds=90,kept_orders=100,profit=10,passed=True,decisions=[])
        self.assertEqual(self.store.ingest([invalid]),[])
        invalid['data']['profit']=float('nan');self.assertEqual(self.store.ingest([invalid]),[])
        old=dict(rows[0],at='2026-10-21T12:00:00Z',data=dict(rows[0]['data'],profit=9))
        self.store.ingest([old]);self.assertEqual(self.store.rows('round_reports')[0]['profit'],1000)
    def test_survey_v2_mappings_reward_once_and_quiz_null(self):
        self.rounds()
        row=self.record('feedback','first',answers=[2,1,3],survey_version='v2',first=True,comment='希望总部帮我找到适合新手起步的海外货源')
        self.store.ingest([row,dict(row,id='test:other-id')])
        f=self.store.rows('feedback')[0]
        self.assertEqual((f['player_segment'],f['intent_shift'],f['insight_moment']),('newbie','awakened','cashflow'))
        self.assertNotIn('fun_score',f)
        with self.store.connect() as db:self.assertEqual(db.execute('SELECT SUM(points) FROM reward_claims').fetchone()[0],70)
        self.assertEqual(self.store.ingest([self.record('feedback','deep',deep=True,comment='太短')]),[])
        self.store.ingest([self.record('quiz_answers','q1',task_id='segment',task_type='cobuilder',choice='casual',correct=None),self.record('quiz_answers','q2',task_id='tax',task_type='hq',choice='a',correct=False),self.record('quiz_answers','q3',task_id='tax',task_type='hq',choice='b',correct=True)])
        summary=self.store.summary();self.assertEqual(summary['quiz_attempts'],2);self.assertEqual(summary['quiz_accuracy'],.5)
    def test_lead_history_encryption_priority_and_email(self):
        self.rounds();self.rounds('high');self.store.ingest([self.lead(),self.lead('high',score=90)])
        later=self.lead(key='lead:2');later['at']='2026-10-22T12:01:00Z';later['data']['consent_at']=later['at'];self.store.ingest([later,later])
        self.store.ingest([self.record('feedback','deep',deep=True,comment='希望总部提供可以直接对照每轮现金变化的表格',survey_version='v2')])
        self.assertEqual(self.store.rows('leads')[0]['user_id'],'test')
        self.assertNotIn('contact_value',self.store.rows('leads')[0])
        self.assertNotEqual(self.store.rows('leads')[0]['email'],'private@example.com')
        with self.store.connect() as db:
            rows=db.execute('SELECT data FROM leads').fetchall();self.assertEqual(len(rows),3)
            self.assertNotIn('private@example.com',str(rows));self.assertNotIn('wx-private',str(rows))
            self.assertEqual(db.execute('SELECT COUNT(*) FROM consent_records').fetchone()[0],3)
        self.assertEqual(self.store.export_leads()[0]['email'],'private@example.com')
        self.assertEqual(deliver(self.store),3);self.assertEqual(deliver(self.store),0)
        files=list((Path(self.temp.name)/'mail-preview').glob('*.eml'));self.assertEqual(len(files),3)
        from email import policy
        from email.parser import BytesParser
        self.assertIn('同一份报告：测试 🧭',BytesParser(policy=policy.default).parsebytes(files[0].read_bytes()).get_content())
    def test_delete_blocks_offline_reappearance(self):
        rows=self.rounds();self.store.ingest([self.lead()]);deliver(self.store)
        self.store.administer('delete-user',{'email':'private@example.com'})
        self.assertEqual(self.store.rows('leads'),[]);self.assertEqual(len(self.store.ingest(rows)),3)
        self.assertEqual(self.store.rows('round_reports'),[]);self.assertEqual(list((Path(self.temp.name)/'mail-preview').glob('*.eml')),[])
    def test_adoption_publication_guard(self):
        self.rounds();self.store.ingest([self.record('feedback','first',answers=[0,0,0],survey_version='v2',comment='希望在这里展示更清楚的回款时间和成本变化')])
        self.store.administer('release',{'version':'v-test','title':'改进回款说明','status':'draft'})
        self.store.administer('review',{'feedback_id':'test:first','status':'adopted','release_version':'v-test','public_summary':'补充回款说明','internal_note':'private-note'})
        self.assertEqual(self.store.public_adoptions(),[])
        self.store.administer('release',{'version':'v-test','title':'改进回款说明','status':'published'})
        public=json.dumps(self.store.public_adoptions(),ensure_ascii=False)
        self.assertNotIn('private-note',public);self.assertNotIn('user_id',public);self.assertIn('CO-',public)
        with self.assertRaises(ValueError):self.store.administer('review',{'feedback_id':'test:first','status':'rejected'})
    def test_legacy_import(self):
        import sqlite3
        from migrate_legacy import import_legacy
        path=Path(self.temp.name)/'old.sqlite3'
        with sqlite3.connect(path) as old:
            old.execute('CREATE TABLE users(id TEXT,first_seen TEXT)');old.execute("INSERT INTO users VALUES ('legacy','2026-10-21')")
            old.execute('CREATE TABLE leads(id TEXT,user_id TEXT,data TEXT,updated_at TEXT)')
            old.execute('INSERT INTO leads VALUES (?,?,?,?)',('legacy:lead','legacy',json.dumps({'email':'old@example.com','wechat':'old-wx'}),'2026-10-21'))
        old.close()
        result=import_legacy(path,self.store);self.assertEqual(result['tables']['users'],1);self.assertEqual(result['tables']['leads'],1)
        with self.store.connect() as db:self.assertNotIn('old@example.com',db.execute('SELECT data FROM leads').fetchone()[0])

    def test_backup_restores_all_business_tables_and_ciphertext(self):
        from export_mysql import export, TABLES
        self.rounds();self.store.ingest([self.lead(),self.record('feedback','first',answers=[1,2,3],survey_version='v2',comment='希望可以帮助我评估海外物流成本与利润空间')])
        self.store.administer('release',{'version':'restore-v1','title':'备份测试','status':'draft'})
        self.store.administer('review',{'feedback_id':'test:first','status':'adopted','release_version':'restore-v1','public_summary':'成本说明','internal_note':'note'})
        deliver(self.store)
        target=Path(self.temp.name)/'backup.sql';manifest=export(self.settings,target)
        other=self.name+'_restore'
        with mysql_db.connect(self.admin) as db:db.execute(f'CREATE DATABASE `{other}` CHARACTER SET utf8mb4')
        try:
            destination=dict(self.settings,database=other);mysql_db.migrate(destination)
            with mysql_db.connect(destination) as db:
                for statement in target.read_text(encoding='utf-8').split(';'):
                    if statement.strip():db.execute(statement)
                for table in TABLES:self.assertEqual(db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0],manifest['tables'][table],table)
                encrypted=json.loads(db.execute('SELECT data FROM leads').fetchone()[0])
                self.assertEqual(self.store.contacts.open(encrypted)['email'],'private@example.com')
        finally:
            with mysql_db.connect(self.admin) as db:db.execute(f'DROP DATABASE `{other}`')

    def test_constraint_failure_rolls_back_batch_and_tutorial_reward_deduplicates(self):
        self.rounds()
        # A SQL-level invalid score must roll back preceding writes, never be acknowledged.
        bad=self.lead();bad['data']['assessment']['averageScore']=101
        event=self.record('events','rollback',event='rollback-probe')
        with self.assertRaises(pymysql.MySQLError):self.store.ingest([event,bad])
        self.assertEqual(self.store.rows('events'),[])
        row=self.record('events','tutorial:complete:1',event='completed',round=1)
        self.store.ingest([row,row]);self.store.ingest([row])
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT SUM(points) FROM reward_claims WHERE reward_type='tutorial_licensed'").fetchone()[0],20)

    def test_http_auth_origin_and_mysql_write(self):
        import threading, urllib.request, urllib.error
        from functools import partial
        http=server.ThreadingHTTPServer(('127.0.0.1',0),partial(server.Handler,store=self.store,token='test-only-token'))
        worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        url=f'http://127.0.0.1:{http.server_port}'
        try:
            with urllib.request.urlopen(url+'/api/health') as response:self.assertEqual(json.load(response)['database'],'mysql')
            with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(url+'/api/admin/leads')
            self.assertEqual(error.exception.code,401)
            row=self.record('events','http-probe',event='game_enter')
            body=json.dumps({'records':[row]}).encode()
            request=urllib.request.Request(url+'/api/records',data=body,headers={'Content-Type':'application/json','Origin':'https://unrelated.invalid'})
            with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(request)
            self.assertEqual(error.exception.code,403)
            request=urllib.request.Request(url+'/api/records',data=body,headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(request) as response:self.assertEqual(json.load(response)['accepted'],['test:http-probe'])
            self.assertEqual(len(self.store.rows('events')),1)
        finally:http.shutdown();http.server_close();worker.join()

if __name__=='__main__':unittest.main()
