import urllib.parse

class QueryGenerator:
    def __init__(self, config):
        """
        Initialize with the loaded configuration dictionary.
        Shape of config should be:
        {
            'roles': ['Role A', 'Role B'],
            'locations': ['Loc A', 'Loc B'],
            ...
        }
        """
        self.roles = config.get('roles', [])
        self.locations = config.get('locations', [])
    
    def generate_google_jobs_queries(self):
        """
        Generates queries for Google Jobs specialized search.
        Format: "{role} jobs in {location}"
        """
        queries = []
        for role in self.roles:
            for loc in self.locations:
                query = f"{role} jobs in {loc}"
                queries.append(query)
        return queries

    def generate_linkedin_site_queries(self):
        """
        Generates queries for Google Search using site:linkedin.com/jobs operator.
        Format: "site:linkedin.com/jobs {role} {location}"
        """
        queries = []
        for role in self.roles:
            for loc in self.locations:
                # Use quotes for stricter matching if desired, or loose for broader results
                query = f'site:linkedin.com/jobs "{role}" "{loc}"'
                queries.append(query)
        return queries

    def generate_general_search_queries(self):
        """
        General queries if needed.
        """
        return self.generate_google_jobs_queries()
