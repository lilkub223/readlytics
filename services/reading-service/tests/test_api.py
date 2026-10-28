from datetime import date, timedelta, datetime, timezone
import jwt
import pytest
from fastapi.testclient import TestClient
from app.main import app, ProgressPayload
from app import main, auth
from app.external_books import UpstreamUnavailable
from app.config import settings
from app.repository import update_progress

ID = '11111111-1111-4111-8111-111111111111'
client = TestClient(app) # lifespan intentionally not entered: dependency-isolated unit tests

def token(**claims):
    return jwt.encode({'sub': ID, 'exp':datetime.now(timezone.utc)+timedelta(minutes=5), **claims}, settings.jwt_secret, algorithm='HS256')

@pytest.mark.parametrize('headers',[{}, {'Authorization':'Bearer malformed'}, {'Authorization':'Bearer '+token(exp=0)}, {'Authorization':'Bearer '+token(sub='not-a-uuid')}])
def test_auth_rejects_invalid_tokens(headers):
    assert client.get('/api/shelves/me',headers=headers).status_code == 401

def test_missing_expiration():
    value = jwt.encode({'sub':ID},settings.jwt_secret,algorithm='HS256')
    assert client.get('/api/shelves/me',headers={'Authorization':'Bearer '+value}).status_code == 401

def test_bad_payloads_fail_before_database():
    headers = {'Authorization':'Bearer '+token()}
    assert client.post('/api/shelves',json={'bookId':'bad','status':'finished'},headers=headers).status_code == 422
    assert client.patch('/api/shelves/'+ID+'/progress',json={'currentPage':-1},headers=headers).status_code == 422
    assert client.post('/api/reviews',json={'bookId':ID,'rating':6},headers=headers).status_code == 422
    assert client.patch('/api/shelves/'+ID+'/progress',json={'currentPage':10,'sessionDate':(date.today()+timedelta(days=1)).isoformat()},headers=headers).status_code == 422

def test_health_reports_database_failure(monkeypatch):
    monkeypatch.setattr(main,'get_database_health',lambda:{'status':'error','message':'Database unavailable.'})
    assert client.get('/health').status_code == 503

def test_search_upstream_failure_is_not_no_results(monkeypatch):
    monkeypatch.setattr(main,'search_cached_books',lambda _:[])
    def fail(*args): raise UpstreamUnavailable()
    monkeypatch.setattr(main,'search_open_library',fail)
    assert client.get('/api/books/search?q=test').status_code == 503

def test_search_uses_cache_on_upstream_failure(monkeypatch):
    cached={'id':ID,'source':'open-library','externalId':'/works/1','title':'Book'}
    monkeypatch.setattr(main,'search_cached_books',lambda _:[cached])
    def fail(*args): raise UpstreamUnavailable()
    monkeypatch.setattr(main,'search_open_library',fail)
    data=client.get('/api/books/search?q=test').json()
    assert data['results']==[cached] and data['warning']

def test_search_deduplicates_and_passes_page(monkeypatch):
    book={'id':ID,'source':'open-library','externalId':'/works/1','title':'Book'}
    monkeypatch.setattr(main,'search_cached_books',lambda _:[])
    def search(q,page):
        assert page==2
        return [{'external_source':'open-library','external_id':'/works/1'}]*2
    monkeypatch.setattr(main,'search_open_library',search)
    monkeypatch.setattr(main,'upsert_book',lambda _:book)
    data=client.get('/api/books/search?q=test&page=2').json()
    assert len(data['results'])==1

def test_wrong_owner_cannot_delete(monkeypatch):
    monkeypatch.setattr(main,'delete_shelf_entry',lambda user_id,entry_id:False)
    assert client.delete('/api/shelves/'+ID,headers={'Authorization':'Bearer '+token()}).status_code==404
