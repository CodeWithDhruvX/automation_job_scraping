import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import pandas as pd
import datetime
import os
import yaml
from typing import List, Dict

# Imports from existing project
from src.connectors.jobspy_connector import JobSpyConnector
from src.utils.logger import logger
import logging

# Configure logger to also print to GUI if needed, or just rely on console
# For now, we will add a custom handler to redirect logs to the GUI text widget

class TextHandler(logging.Handler):
    def __init__(self, text_widget):
        super().__init__()
        self.text_widget = text_widget

    def emit(self, record):
        msg = self.format(record)
        def append():
            self.text_widget.configure(state='normal')
            self.text_widget.insert(tk.END, msg + '\n')
            self.text_widget.configure(state='disabled')
            self.text_widget.yview(tk.END)
        # Schedule update on main thread
        self.text_widget.after(0, append)

class JobSpyUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Job Scraping Automation")
        self.root.geometry("800x650")
        
        self.scraped_data: List[Dict] = []
        self.is_scraping = False
        
        # Load Config (for defaults)
        self.config = self.load_config()
        
        self._setup_ui()
        
    def load_config(self):
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'config/config.yaml')
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
        return {}

    def _setup_ui(self):
        # --- Filters Frame ---
        filter_frame = ttk.LabelFrame(self.root, text="Search Filters", padding=10)
        filter_frame.pack(fill="x", padx=10, pady=5)
        
        # Row 0: Job Title & Location
        ttk.Label(filter_frame, text="Job Title / Keywords:").grid(row=0, column=0, sticky="w", padx=5, pady=5)
        self.entry_title = ttk.Entry(filter_frame, width=30)
        self.entry_title.grid(row=0, column=1, sticky="w", padx=5, pady=5)
        
        ttk.Label(filter_frame, text="Location:").grid(row=0, column=2, sticky="w", padx=5, pady=5)
        self.entry_location = ttk.Entry(filter_frame, width=30)
        self.entry_location.grid(row=0, column=3, sticky="w", padx=5, pady=5)
        
        # Row 1: Experience & Posting Date
        ttk.Label(filter_frame, text="Experience Level:").grid(row=1, column=0, sticky="w", padx=5, pady=5)
        self.combo_experience = ttk.Combobox(filter_frame, values=["Any", "Internship", "Entry Level", "Associate", "Mid-Senior", "Director", "Executive"], state="readonly")
        self.combo_experience.current(0)
        self.combo_experience.grid(row=1, column=1, sticky="w", padx=5, pady=5)
        
        ttk.Label(filter_frame, text="Posting Date:").grid(row=1, column=2, sticky="w", padx=5, pady=5)
        self.combo_date = ttk.Combobox(filter_frame, values=["Any", "Last 24h", "Last 3 days", "Last 7 days", "Last 30 days"], state="readonly")
        self.combo_date.current(0)
        self.combo_date.grid(row=1, column=3, sticky="w", padx=5, pady=5)

        # Row 2: Salary Range
        ttk.Label(filter_frame, text="Salary Min:").grid(row=2, column=0, sticky="w", padx=5, pady=5)
        self.entry_salary_min = ttk.Entry(filter_frame, width=15)
        self.entry_salary_min.grid(row=2, column=1, sticky="w", padx=5, pady=5)
        
        ttk.Label(filter_frame, text="Salary Max:").grid(row=2, column=2, sticky="w", padx=5, pady=5)
        self.entry_salary_max = ttk.Entry(filter_frame, width=15)
        self.entry_salary_max.grid(row=2, column=3, sticky="w", padx=5, pady=5)
        
        # Row 3: Job Sites
        site_frame = ttk.LabelFrame(filter_frame, text="Sites", padding=5)
        site_frame.grid(row=3, column=0, columnspan=4, sticky="ew", padx=5, pady=5)
        
        self.var_indeed = tk.BooleanVar(value=True)
        self.var_linkedin = tk.BooleanVar(value=True)
        self.var_glassdoor = tk.BooleanVar(value=True)
        self.var_zip = tk.BooleanVar(value=False)
        
        ttk.Checkbutton(site_frame, text="Indeed", variable=self.var_indeed).pack(side="left", padx=10)
        ttk.Checkbutton(site_frame, text="LinkedIn", variable=self.var_linkedin).pack(side="left", padx=10)
        ttk.Checkbutton(site_frame, text="Glassdoor", variable=self.var_glassdoor).pack(side="left", padx=10)
        ttk.Checkbutton(site_frame, text="ZipRecruiter", variable=self.var_zip).pack(side="left", padx=10)

        # --- Controls Dispay ---
        control_frame = ttk.Frame(self.root, padding=10)
        control_frame.pack(fill="x")
        
        self.btn_start = ttk.Button(control_frame, text="Start Scraping", command=self.start_scraping_thread)
        self.btn_start.pack(side="left", padx=5)
        
        self.btn_export = ttk.Button(control_frame, text="Export to Excel", command=self.export_to_excel, state="disabled")
        self.btn_export.pack(side="left", padx=5)
        
        self.btn_clear = ttk.Button(control_frame, text="Clear Filters", command=self.clear_filters)
        self.btn_clear.pack(side="left", padx=5)
        
        self.lbl_status = ttk.Label(control_frame, text="Ready")
        self.lbl_status.pack(side="left", padx=20)
        
        # --- Output Area ---
        output_frame = ttk.LabelFrame(self.root, text="Logs & Progress", padding=10)
        output_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        self.text_log = scrolledtext.ScrolledText(output_frame, state='disabled', height=15)
        self.text_log.pack(fill="both", expand=True)
        
        # Attach logger
        handler = TextHandler(self.text_log)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    def clear_filters(self):
        self.entry_title.delete(0, tk.END)
        self.entry_location.delete(0, tk.END)
        self.entry_salary_min.delete(0, tk.END)
        self.entry_salary_max.delete(0, tk.END)
        self.combo_experience.current(0)
        self.combo_date.current(0)
        self.var_indeed.set(True)
        self.var_linkedin.set(True)
        self.var_glassdoor.set(True)
        self.var_zip.set(False)

    def start_scraping_thread(self):
        if self.is_scraping:
            return
        
        title = self.entry_title.get().strip()
        if not title:
            messagebox.showwarning("Input Error", "Please enter a Job Title or Keyword.")
            return
            
        self.is_scraping = True
        self.btn_start.configure(state="disabled")
        self.btn_export.configure(state="disabled")
        self.lbl_status.configure(text="Scraping in progress...")
        self.text_log.configure(state='normal')
        self.text_log.delete(1.0, tk.END)
        self.text_log.configure(state='disabled')
        
        thread = threading.Thread(target=self.run_scraping)
        thread.daemon = True
        thread.start()

    def run_scraping(self):
        try:
            # Collect inputs
            title = self.entry_title.get().strip()
            location = self.entry_location.get().strip()
            
            # Construct Keyword with extra filters if needed
            # JobSpy doesn't universally support Salary/Exp as strict API args, 
            # so we append them to query for better relevance if they are standard terms
            
            # Helper for Date
            date_map = {
                "Last 24h": 24,
                "Last 3 days": 72,
                "Last 7 days": 168,
                "Last 30 days": 720
            }
            hours_old = date_map.get(self.combo_date.get())
            
            # Site selection
            sites = []
            if self.var_indeed.get(): sites.append("indeed")
            if self.var_linkedin.get(): sites.append("linkedin")
            if self.var_glassdoor.get(): sites.append("glassdoor")
            if self.var_zip.get(): sites.append("zip_recruiter")
            
            if not sites:
                self.log("No sites selected. Defaulting to LinkedIn & Indeed.")
                sites = ["linkedin", "indeed"]

            # Initialize Connector
            # We create a dummy config with necessary defaults if real config missing
            connector_config = {
                "sources": {"jobspy": {"enabled": True}},
                "search": {"results_wanted": 20, "country_indir": "India"} 
            }
            # Merge with loaded config if available
            if self.config:
                connector_config.update(self.config)

            connector = JobSpyConnector(connector_config)
            
            self.log(f"Starting scrape for '{title}' in '{location}'...")
            
            # NOTE: We are NOT using 'Experience' or 'Salary' in the API call directly 
            # as JobSpy `scrape_jobs` signature is limited. 
            # One could append to title: f"{title} {experience}" but that might over-restrict.
            # Leaving as-is for now, focusing on Title, Location, Date, Sites.
            
            jobs = connector.search(
                query=title,
                site_name=sites,
                location=location,
                hours_old=hours_old
            )
            
            self.scraped_data = jobs
            self.log(f"Scraping finished. Found {len(jobs)} jobs.")
            
            # Enable Export
            self.root.after(0, lambda: self.btn_export.configure(state="normal"))
            
        except Exception as e:
            self.log(f"Error during scraping: {e}")
            logger.error(f"Scraping Exception: {e}", exc_info=True)
        finally:
            self.is_scraping = False
            self.root.after(0, lambda: self.btn_start.configure(state="normal"))
            self.root.after(0, lambda: self.lbl_status.configure(text="Done"))

    def export_to_excel(self):
        if not self.scraped_data:
            messagebox.showinfo("Export", "No data to export.")
            return
            
        try:
            df = pd.DataFrame(self.scraped_data)
            
            # Define requested columns in order
            columns_order = [
                "SITE", "TITLE", "COMPANY", "CITY", "STATE", 
                "JOB_TYPE", "INTERVAL", "MIN_AMOUNT", "MAX_AMOUNT", 
                "JOB_URL", "DESCRIPTION"
            ]
            
            # Filter DataFrame to include only these columns, adding missing ones if necessary
            # ensuring all exist to avoid KeyError
            for col in columns_order:
                if col not in df.columns:
                    df[col] = ""
            
            df = df[columns_order]
            
            # Timestamp
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            keyword = self.entry_title.get().strip().replace(" ", "_")
            filename = f"jobs_{keyword}_{ts}.xlsx"
            
            # Ensure data/exports exists or just use current dir
            # User asked for "sample excel output" implying local might be fine, but let's try data/exports
            output_dir = "data/exports"
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            path = os.path.join(output_dir, filename)
            df.to_excel(path, index=False)
            
            self.log(f"Exported to {path}")
            messagebox.showinfo("Export Successful", f"Saved to {path}")
            
        except Exception as e:
            self.log(f"Export failed: {e}")
            messagebox.showerror("Export Error", str(e))

    def log(self, message):
        logger.info(message)

if __name__ == "__main__":
    root = tk.Tk()
    app = JobSpyUI(root)
    root.mainloop()
