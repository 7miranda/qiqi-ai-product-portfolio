"""Delivery queue: local .eml previews by default; SMTP only when explicitly configured."""
import json
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from datetime import datetime, timezone

def deliver(store):
    with store.connect() as db:
        if db.execute("SELECT GET_LOCK('crossbound-delivery',0)").fetchone()[0]!=1: return 0
        count=0
        try:
            rows=db.execute("SELECT d.id,l.data,a.data FROM report_deliveries d JOIN leads l ON l.id=d.lead_id JOIN assessments a ON a.id=d.assessment_id WHERE d.channel='email' AND d.status='pending' AND d.attempts<3 ORDER BY d.created_at LIMIT 20 FOR UPDATE").fetchall()
            for key,lead,assessment in rows:
                try:
                    lead=json.loads(lead);a=json.loads(assessment)
                    contact=store.contacts.open(lead)
                    message=EmailMessage()
                    message['Subject']='你的 Crossbound 出海经营评估报告'
                    message['From']=os.environ.get('CROSSBOUND_SMTP_FROM','crossbound@localhost')
                    message['To']=contact['email']
                    import hashlib
                    message['Message-ID']='<'+hashlib.sha256(key.encode()).hexdigest()+'@crossbound.local>'
                    report=lead.get('report_text') or '\n'.join([a.get('title','经营评估')]+[f"{s['name']}：{s['value']}/100；{s.get('detail','')}" for s in a.get('scores',[]) if lead.get('tier')=='full' or s['key'] in ('profit','knowledge')]+[a.get('suggestion','')])
                    message.set_content(report)
                    smtp_host=os.environ.get('CROSSBOUND_SMTP_HOST')
                    if smtp_host:
                        with smtplib.SMTP(smtp_host,int(os.environ.get('CROSSBOUND_SMTP_PORT','587')),timeout=15) as client:
                            client.starttls()
                            client.login(os.environ['CROSSBOUND_SMTP_USER'],os.environ['CROSSBOUND_SMTP_PASSWORD'])
                            client.send_message(message)
                        status='sent'
                    else:
                        folder=store.data_dir/'mail-preview';folder.mkdir(exist_ok=True)
                        file=folder/(hashlib.sha256(key.encode()).hexdigest()+'.eml')
                        file.write_bytes(message.as_bytes());status='available'
                    error=None;count+=1
                except Exception as exc:
                    status='failed';error=type(exc).__name__  # No SMTP response or contact leaks in logs.
                db.execute('UPDATE report_deliveries SET status=%s,attempts=attempts+1,last_error=%s,updated_at=%s WHERE id=%s',(status,error,datetime.now(timezone.utc).isoformat(),key))
        finally: db.execute("SELECT RELEASE_LOCK('crossbound-delivery')")
        return count
