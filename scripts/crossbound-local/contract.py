"""Versioned ingestion contract shared by preview and deployment."""
import math
from datetime import datetime

VERSION = '2026-10-22'
SEGMENTS = ('veteran','domestic','newbie','casual')
INTENTS = ('stronger','awakened','unchanged','deterred')
INSIGHTS = ('tax','returns','ads','cashflow')
LEAD_OPTIONS = {
    'category': ('美妆','家居','3C数码','服饰','食品','其他'),
    'followers': ('还没开始','1千以下','1千~1万','1万~10万','10万+'),
    'platform': ('抖音','TikTok','快手','小红书','B站'),
}

def canonical_time(value):
    parsed = datetime.fromisoformat(value.replace('Z','+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp must include timezone')
    from datetime import timezone
    return parsed.astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')

def valid(table, data):
    # Reject nonfinite numbers at every depth, even in legacy envelopes.
    def finite(value):
        if isinstance(value, float): return math.isfinite(value)
        if isinstance(value, dict): return all(finite(v) for v in value.values())
        if isinstance(value, list): return all(finite(v) for v in value)
        return True
    if not finite(data): return False
    if data.get('schema_version') != VERSION: return True
    if table == 'events':
        return isinstance(data.get('event'),str) and 1 <= len(data['event']) <= 80
    if table == 'round_reports':
        if data.get('completed'):
            for field in ('orders','refunds','kept_orders'):
                if type(data.get(field)) is not int or data[field] < 0: return False
            if data['orders']-data['refunds'] != data['kept_orders']: return False
            if type(data.get('profit')) not in (float,int) or type(data.get('passed')) is not bool: return False
        return isinstance(data.get('decisions'),list)
    if table == 'quiz_answers':
        return (data.get('task_type') in ('hq','review','cobuilder') and
                isinstance(data.get('task_id'),str) and isinstance(data.get('choice'),str) and
                (data.get('correct') is None if data.get('task_type')=='cobuilder' else type(data.get('correct')) is bool))
    if table == 'leads':
        return all(data.get(k) in values for k,values in LEAD_OPTIONS.items()) and data.get('policy_version')=='cooperation-v2' and data.get('touchpoint')=='report'
    if table == 'assessments':
        return type(data.get('rounds')) is int and data['rounds']>=1 and all(type(data.get(k)) in (int,float) and 0<=data[k]<=100 for k in ('averageScore','profit_score','stability_score','breadth_score','knowledge_score'))
    return True
