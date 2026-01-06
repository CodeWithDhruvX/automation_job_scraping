import unittest
from unittest.mock import MagicMock, patch
from src.core.normalizer import DataNormalizer
from src.connectors.free_search_connector import FreeSearchConnector

class TestJobScraper(unittest.TestCase):
    
    def test_normalizer_title(self):
        raw = "Senior Engineer (Remote) | Company Name"
        normalized = DataNormalizer.normalize_title(raw)
        self.assertEqual(normalized, "Senior Engineer")

    def test_normalizer_location(self):
        raw = "New York, NY 10001"
        normalized = DataNormalizer.normalize_location(raw)
        self.assertEqual(normalized, "New York, NY")

        raw_remote = "United States - Remote"
        normalized_remote = DataNormalizer.normalize_location(raw_remote)
        self.assertEqual(normalized_remote, "Remote")

    @patch('src.connectors.free_search_connector.DDGS')
    def test_free_search_connector(self, mock_ddgs_cls):
        # Mock DuckDuckGo instance and its text method
        mock_ddgs_instance = MagicMock()
        mock_ddgs_cls.return_value = mock_ddgs_instance
        
        # Mock results generator
        mock_ddgs_instance.text.return_value = [
            {
                "title": "Python Developer",
                "href": "http://test.com/job",
                "body": "Job description here"
            }
        ]

        # Config (no key needed)
        config = {'search': {'engine': 'duckduckgo', 'requests_delay': 0}}
        connector = FreeSearchConnector(config)
        
        results = connector.search("python developer")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], "Python Developer")
        self.assertEqual(results[0]['source'], "DuckDuckGo (python developer)")

if __name__ == '__main__':
    unittest.main()
