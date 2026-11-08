"""Offline regression tests; provider fixtures are synthetic and never market evidence."""
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
import app as server
from config import MARKETPLACES
from kdp_engine import autocomplete, product_scraper, trends


class MarketDataTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()

    def test_autocomplete_malformed_and_http_are_errors_not_empty_success(self):
        for status, payload in [(403, {}), (200, {'unexpected': []})]:
            resp = Mock(status_code=status); resp.json.return_value = payload
            with self.subTest(status=status), self.assertRaises(RuntimeError):
                autocomplete._query_one('weekly planning', 'digital-text', MARKETPLACES['us'], Mock(get=Mock(return_value=resp)))

    def test_autocomplete_live_shape_fixture(self):
        response = Mock(status_code=200); response.json.return_value = {'suggestions': [{'value': 'Weekly Planning'}, {'value': 'weekly planner'}]}
        result = autocomplete._query_one('weekly', 'digital-text', MARKETPLACES['us'], Mock(get=Mock(return_value=response)))
        self.assertEqual(result, [('weekly planning', 1), ('weekly planner', 2)])

    def test_failure_never_produces_mock_keywords(self):
        with patch.object(autocomplete, 'mine_autocomplete', side_effect=ConnectionError('offline')):
            r = autocomplete.mine_multiple(['weekly planning'])
        self.assertEqual(r['keywords'], [])
        self.assertFalse(r['mock_used']); self.assertEqual(len(r['errors']), 1)
        with self.assertRaises(ValueError):
            autocomplete.mine_multiple(['weekly'], allow_mock=True)

    def test_blocked_mining_responds_unavailable_without_score(self):
        data = {'keywords': [], 'per_seed': {'weekly planning': []}, 'errors': [{'seed': 'weekly planning', 'error': 'offline'}], 'mock_used': False}
        with patch.object(server, 'mine_multiple', return_value=data):
            for route in ('/api/mine','/api/research'):
                r = self.client.post(route, json={'seeds': ['weekly planning']})
                self.assertEqual(r.status_code, 503)
                self.assertEqual(r.json['status'], 'UNAVAILABLE')
                self.assertNotIn('scored', r.json); self.assertFalse(r.json['mock'])

    def test_failed_competition_and_asin_no_fabrication(self):
        data = {'keywords': [{'keyword':'weekly planning','position':1,'seed':'weekly'}], 'per_seed': {'weekly': [('weekly planning', 1)]}, 'errors': [], 'mock_used':False}
        with patch.object(server,'mine_multiple',return_value=data), patch.object(server,'scrape_search_results',return_value={'status':'blocked','error':'CAPTCHA'}), patch.object(server,'scrape_multiple',return_value=[{'asin':'B012345678','status':'blocked'}]), patch.object(server.time,'sleep'):
            r = self.client.post('/api/research',json={'seeds':['weekly'],'asins':['B012345678']})
        self.assertEqual(r.status_code, 200)
        d=r.json; self.assertIsNone(d['mined'][0]['result_count']); self.assertEqual(d['mined'][0]['competition_status'],'blocked')
        self.assertEqual(d['top20'], []); self.assertEqual(d['low_competition'], [])
        self.assertEqual(d['competitors']['books'][0]['status'],'blocked')
        self.assertNotIn('bsr',d['competitors']['books'][0]); self.assertFalse(d['meta']['mock'])
        self.assertTrue(any('neutral assumptions' in w for w in d['warnings']))

    def test_partial_mining_and_missing_count_status(self):
        data = {'keywords': [{'keyword':'weekly planning','position':1,'seed':'weekly'}], 'per_seed': {'weekly': [('weekly planning', 1)], 'other': []}, 'errors': [{'seed':'other','error':'offline'}], 'mock_used':False}
        with patch.object(server,'mine_multiple',return_value=data), patch.object(server,'scrape_search_results',return_value={'status':'ok','result_count':None,'results':[]}), patch.object(server.time,'sleep'):
            r = self.client.post('/api/research',json={'seeds':['weekly','other']})
        self.assertEqual(r.json['mined'][0]['competition_status'],'unavailable')
        self.assertIsNone(r.json['mined'][0]['result_count'])
        self.assertIn('PARTIAL',r.json['sources']['keywords'])
        self.assertTrue(any('incomplete' in w for w in r.json['warnings']))

    def test_product_never_invents_sales_or_revenue(self):
        response = Mock(status_code=200, text='<html><span id="productTitle">Fixture</span><div>Best Sellers Rank: #10,000 in Books</div><span class="a-price"><span class="a-offscreen">$9.99</span></span></html>')
        with patch.object(product_scraper.requests, 'get', return_value=response):
            data = product_scraper.scrape_product('B012345678')
        self.assertEqual(data['status'], 'ok')
        self.assertIsNone(data['est_daily_sales'])
        self.assertIsNone(data['est_monthly_revenue_usd'])
        self.assertEqual(data['sales_status'], 'UNAVAILABLE')

    def test_search_result_parser_fixture(self):
        response=Mock(status_code=200, text='<html><div class="s-result-info-bar">1-16 of over 10,000 results for weekly planning</div></html>')
        with patch.object(product_scraper.requests,'get',return_value=response):
            result=product_scraper.scrape_search_results('weekly planning')
        self.assertEqual(result['result_count'],10000); self.assertEqual(result['status'],'ok')
        self.assertEqual(result['result_count_kind'], 'lower_bound')
        response.text='<div class="s-result-info-bar">1-16 results for weekly planning</div>'
        with patch.object(product_scraper.requests,'get',return_value=response):
            result=product_scraper.scrape_search_results('weekly planning')
        # A page-range ending in 16 is not a total result count.
        self.assertIsNone(result['result_count'])

    def test_empty_live_results_do_not_produce_a_score(self):
        data = {'keywords': [], 'per_seed': {'weekly': []}, 'errors': [], 'mock_used': False}
        with patch.object(server, 'mine_multiple', return_value=data):
            r = self.client.post('/api/research', json={'seeds': ['weekly']})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json['status'], 'NO_RESULTS')
        self.assertNotIn('scored', r.json)

    def test_lower_bound_not_identified_as_low_competition(self):
        data = {'keywords': [{'keyword':'weekly planning','position':1,'seed':'weekly'}], 'per_seed': {'weekly': [('weekly planning',1)]}, 'errors': [], 'mock_used':False}
        search = {'status':'ok', 'result_count':100, 'result_count_text':'over 100 results', 'result_count_kind':'lower_bound', 'results':[]}
        with patch.object(server,'mine_multiple',return_value=data), patch.object(server,'scrape_search_results',return_value=search), patch.object(server.time,'sleep'):
            r = self.client.post('/api/research',json={'seeds':['weekly'], 'price':4.99})
        self.assertEqual(r.json['low_competition'], [])
        self.assertTrue(any('lower bounds' in w for w in r.json['warnings']))

    def test_trends_unavailable_not_synthetic_and_actual_preserved(self):
        with patch.object(trends, 'try_pytrends', return_value=None):
            r = self.client.post('/api/trends',json={'keyword':'weekly planning'})
        self.assertEqual(r.json['status'],'UNAVAILABLE'); self.assertEqual(r.json['values'],[])
        fixture={'values':[10,20,30], 'labels':['a','b','c'], 'source':'fixture Google Trends', 'status':'ACTUAL'}
        with patch.object(trends, 'try_pytrends',return_value=fixture):
            r=self.client.post('/api/trends',json={'keyword':'weekly planning'})
        self.assertEqual(r.json['status'],'ACTUAL'); self.assertEqual(r.json['values'],[10,20,30])

    def test_royalty_is_labeled_estimated(self):
        r=self.client.post('/api/profit',json={'price':9.99,'pages':120,'marketplace':'us'})
        self.assertEqual(r.json['status'],'ESTIMATED'); self.assertIn('verify', r.json['warning'].lower())


if __name__ == '__main__': unittest.main()
