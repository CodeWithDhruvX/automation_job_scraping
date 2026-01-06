from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, UniqueConstraint, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class Job(Base):
    __tablename__ = 'jobs'

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=False)
    url = Column(Text, nullable=False, unique=True)
    source = Column(String, nullable=False)
    keyword = Column(String, nullable=True) # The search term used to find this
    date_found = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    
    # Secondary check to prevent logical duplicates even if URL varies slightly
    # (though URL unique constraint is the primary defense)
    __table_args__ = (
        UniqueConstraint('url', name='uix_job_url'),
    )

    def to_dict(self):
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "url": self.url,
            "source": self.source,
            "keyword": self.keyword,
            "date_found": self.date_found.isoformat(),
            "last_seen": self.last_seen.isoformat()
        }

class DatabaseManager:
    def __init__(self, connection_string):
        self.engine = create_engine(connection_string, echo=False)
        self.Session = sessionmaker(bind=self.engine)
    
    def create_tables(self):
        Base.metadata.create_all(self.engine)
    
    def get_session(self):
        return self.Session()
