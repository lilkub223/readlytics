"""Real API/SQL integration tests. Fixed localhost ports; disposable QA data only."""
from uuid import uuid4
import httpx
import pytest
USER='http://127.0.0.1:4001'
READ='http://127.0.0.1:4002'
ANALYTICS='http://127.0.0.1:4003'
BOOK='22222222-2222-4222-8222-000000000001'

def account():
    name='api'+uuid4().hex[:12]
    r=httpx.post(USER+'/api/auth/register',json={'email':name+'@example.com','username':name,'password':'valid-test-password','displayName':'API Reader'})
    assert r.status_code==201,r.text
    data=r.json()
    return data,{'Authorization':'Bearer '+data['token']}

def test_ownership_reviews_and_feed_are_backed_by_real_records():
    first,h1=account();second,h2=account()
    r=httpx.post(READ+'/api/shelves',headers=h1,json={'bookId':BOOK,'status':'currently_reading','currentPage':0});assert r.status_code==200
    entry=r.json()['entry']['entryId']
    assert httpx.patch(READ+f'/api/shelves/{entry}/progress',headers=h2,json={'currentPage':30}).status_code==404
    assert httpx.delete(READ+f'/api/shelves/{entry}',headers=h2).status_code==404
    assert httpx.patch(READ+f'/api/shelves/{entry}/progress',headers=h1,json={'currentPage':201}).status_code==422
    assert httpx.patch(READ+f'/api/shelves/{entry}/progress',headers=h1,json={'currentPage':25}).status_code==200
    summary=httpx.get(ANALYTICS+'/api/analytics/me/summary',headers=h1).json();assert summary['pagesReadTotal']==25
    review=httpx.post(READ+'/api/reviews',headers=h1,json={'bookId':BOOK,'rating':4,'reviewText':'API integration review'}).json()['review']
    assert httpx.delete(READ+'/api/reviews/'+review['id'],headers=h2).status_code==404
    assert httpx.post(USER+f'/api/users/{first["user"]["id"]}/follow',headers=h2).status_code==201
    feed=httpx.get(ANALYTICS+'/api/feed/me',headers=h2).json()['items'];assert any(first['user']['username'] in item['message'] for item in feed)
    public=httpx.get(USER+'/api/users/'+first['user']['username']).json()['profile'];assert 'email' not in public and 'password_hash' not in public
    following=httpx.get(USER+f'/api/users/{second["user"]["id"]}/following').json()['following'];assert first['user']['id'] in [u['id'] for u in following]
    assert httpx.delete(USER+f'/api/users/{first["user"]["id"]}/follow',headers=h2).status_code==200
    assert httpx.delete(READ+'/api/reviews/'+review['id'],headers=h1).status_code==200
    assert httpx.delete(READ+f'/api/shelves/{entry}',headers=h1).status_code==200
    shelves=httpx.get(READ+'/api/shelves/me',headers=h1).json();assert sum(map(len,shelves.values()))==0


def test_duplicate_shelf_saves_preserve_identifiers_and_review_upserts():
    user,headers=account()
    entries=[httpx.post(READ+'/api/shelves',headers=headers,json={'bookId':BOOK,'status':status,'currentPage':0}).json()['entry'] for status in ['want_to_read','currently_reading','finished','did_not_finish']]
    assert len({e['entryId'] for e in entries})==1
    shelves=httpx.get(READ+'/api/shelves/me',headers=headers).json();assert sum(map(len,shelves.values()))==1
    assert len(shelves['did_not_finish'])==1 and shelves['did_not_finish'][0]['finishedAt'] is None
    ids=[httpx.post(READ+'/api/reviews',headers=headers,json={'bookId':BOOK,'rating':rating}).json()['review']['id'] for rating in [3,5]]
    assert ids[0]==ids[1]
    summary=httpx.get(ANALYTICS+'/api/analytics/me/summary',headers=headers).json();assert summary['averageRating']==5
