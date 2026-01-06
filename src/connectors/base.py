from abc import ABC, abstractmethod
from typing import List, Dict

class BaseConnector(ABC):
    def __init__(self, config=None):
        self.config = config or {}

    @abstractmethod
    def search(self, query: str) -> List[Dict]:
        """
        Search for jobs based on the query.
        Returns a list of standardized job dictionaries:
        {
            "title": "",
            "company": "",
            "location": "",
            "url": "",
            "source": "",
            "keyword": "", # Optional, the term used to find it
            "date_found": ""
        }
        """
        pass
