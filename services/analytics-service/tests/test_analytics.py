from datetime import date,timedelta
from fastapi.testclient import TestClient
import pytest
from app.main import app
from app import main
from app.repository import _calculate_streak

@pytest.mark.parametrize('offsets,expected', [([],0),([0],1),([1],1),([0,1,2],3),([0,0,1,3],2),([2,3],0),([1,2,3],3)])
def test_streaks(offsets,expected):
    assert _calculate_streak([date.today()-timedelta(days=n) for n in offsets]) == expected

def test_protected_analytics():
    client=TestClient(app)
    for route in ['/api/analytics/me/summary','/api/recommendations/me','/api/feed/me']:
        assert client.get(route).status_code==401

def test_health_reports_failure(monkeypatch):
    monkeypatch.setattr(main,'get_database_health',lambda:{'status':'error'})
    assert TestClient(app).get('/health').status_code==503
