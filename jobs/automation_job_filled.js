(function () {
    const experiences = [
        {
            jobTitle: "Senior Engineer",
            company: "Ascendion Pvt. Ltd.",
            location: "",
            fromMonth: "08",
            fromYear: "2024",
            toMonth: "",
            toYear: "",
            currentlyWorking: true,
            description: `Project: Insight Governance (Client: KPMG)
• Spearheaded integration of PowerBI dashboards into the client-facing UI, enhancing data visualization and decision-making processes, resulting in 15% increase in operational efficiency.
• Architected and deployed containerized microservices using Docker and Kubernetes on Azure Kubernetes Service (AKS).
• Designed and implemented a high-throughput file upload and processing pipeline using Azure Blob Storage and async messaging.
• Developed automated CI/CD pipelines in Azure DevOps with SonarLint quality gates and automated testing.`.trim()
        },
        {
            jobTitle: "Senior Engineer",
            company: "Ascendion Pvt. Ltd.",
            location: "",
            fromMonth: "03",
            fromYear: "2023",
            toMonth: "07",
            toYear: "2024",
            currentlyWorking: false,
            description: `Project: KPMG Audit Platform
• Led backend architecture using Spring Boot & Spring Cloud.
• Implemented RBAC and input validation with Spring Security and Hibernate Validator.
• Built reusable services improving development speed by 25%.
• Improved test coverage with JUnit & Mockito in Agile environment.`.trim()
        },
        {
            jobTitle: "Senior Programmer",
            company: "Elegant Microweb Pvt. Ltd.",
            location: "",
            fromMonth: "03",
            fromYear: "2022",
            toMonth: "02",
            toYear: "2023",
            currentlyWorking: false,
            description: `Project: Asinversion
• Led full-stack development using Angular and Spring Boot.
• Optimized REST APIs by 20% via async processing and query optimization.
• Managed Docker deployments with zero-downtime releases.
• Mentored junior developers on scalable microservice architecture.`.trim()
        },
        {
            jobTitle: "Software Engineer",
            company: "Tatvasoft Pvt. Ltd.",
            location: "",
            fromMonth: "09",
            fromYear: "2021",
            toMonth: "02",
            toYear: "2022",
            currentlyWorking: false,
            description: `Project: VendvoCPQ
• Built CRM admin console using React (Redux Toolkit) & Spring Boot.
• Automated CI/CD with Docker, Kubernetes & Azure DevOps.
• Translated business requirements into technical solutions.`.trim()
        },
        {
            jobTitle: "Software Engineer",
            company: "Tatvasoft Pvt. Ltd.",
            location: "",
            fromMonth: "03",
            fromYear: "2021",
            toMonth: "08",
            toYear: "2021",
            currentlyWorking: false,
            description: `Project: Wassel-UI
• Built healthcare microservices using Spring Boot.
• Reduced downtime 30% using circuit breaker patterns.
• Optimized Angular UI performance and data binding.`.trim()
        },
        {
            jobTitle: "Junior Software Engineer",
            company: "Theta Technolabs Pvt. Ltd.",
            location: "",
            fromMonth: "09",
            fromYear: "2020",
            toMonth: "02",
            toYear: "2021",
            currentlyWorking: false,
            description: `Project: MachineUI
• Developed REST APIs using Spring Boot & Node.js.
• Implemented JWT-based security.
• Automated deployment & monitoring using Docker & Azure.`.trim()
        },
        {
            jobTitle: "Junior Software Engineer",
            company: "Prishusoft Pvt. Ltd.",
            location: "",
            fromMonth: "03",
            fromYear: "2019",
            toMonth: "08",
            toYear: "2020",
            currentlyWorking: false,
            description: `Projects: QuotePro, TruckUI
• Built APIs in Spring Boot & Node.js.
• Improved UI responsiveness with Angular Material and lazy loading.`.trim()
        },
        {
            jobTitle: "Junior Software Engineer",
            company: "Contis Pvt. Ltd.",
            location: "",
            fromMonth: "06",
            fromYear: "2018",
            toMonth: "02",
            toYear: "2019",
            currentlyWorking: false,
            description: `Project: Contis Banking System
• Improved image processing pipelines reducing storage 60%.
• Implemented Prometheus monitoring & alerting.`.trim()
        },
        {
            jobTitle: "Software Engineer",
            company: "ABC Technologies",
            location: "Bangalore",
            fromMonth: "06",
            fromYear: "2021",
            toMonth: "12",
            toYear: "2024",
            currentlyWorking: false,
            description: `• Designed and developed scalable web applications.
• Built RESTful APIs and integrated third-party services.
• Optimized performance and improved UX.
• Implemented secure authentication & authorization.
• Wrote unit & integration tests.
• Automated CI/CD pipelines.`.trim()
        },
        {
            jobTitle: "Junior Developer",
            company: "XYZ Solutions",
            location: "Chennai",
            fromMonth: "01",
            fromYear: "2019",
            toMonth: "05",
            toYear: "2021",
            currentlyWorking: false,
            description: `• Developed and maintained web applications.
• Fixed bugs and delivered feature enhancements.
• Wrote clean and maintainable code.
• Participated in testing and deployment.`.trim()
        }
    ];


    function setValue(el, value) {
        if (!el) return false;
        try {
            // For spinbutton inputs (like date fields), click first to activate
            if (el.getAttribute('role') === 'spinbutton') {
                el.click();
            }
            el.focus();
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            el.dispatchEvent(new Event("blur", { bubbles: true }));
            return true;
        } catch (e) {
            console.error("Error setting value:", e);
            return false;
        }
    }

    function setCheckbox(el, checked) {
        if (!el) return false;
        try {
            el.checked = checked;
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
        } catch (e) {
            console.error("Error setting checkbox:", e);
            return false;
        }
    }

    // Get all experience blocks
    function getAllExperienceBlocks() {
        const blocks = [];
        const headings = [...document.querySelectorAll("h3, h4, h5")];

        for (const heading of headings) {
            const headingText = heading.textContent.trim();
            // Match "Work Experience 1", "Work Experience 2", etc.
            if (/Work Experience \d+/.test(headingText)) {
                // The container is heading.parentElement.parentElement
                let container = heading.parentElement?.parentElement;

                if (container) {
                    blocks.push({ heading, container, text: headingText });
                }
            }
        }
        return blocks;
    }

    function findInputByName(block, nameAttr) {
        if (!block) return null;
        return block.querySelector(`input[name="${nameAttr}"], textarea[name="${nameAttr}"]`);
    }

    function findInputByLabel(block, labelText) {
        if (!block) return null;

        // Find all labels in the block
        const labels = [...block.querySelectorAll("label")];
        const label = labels.find(l => {
            const text = l.textContent.trim();
            return text === labelText || text === labelText + "*" || text.startsWith(labelText);
        });

        if (label) {
            const id = label.getAttribute("for");
            if (id) {
                const input = block.querySelector(`#${id}`);
                if (input) return input;
            }
            // Check if input is inside the label
            let input = label.querySelector("input, textarea");
            if (input) return input;

            // Check next siblings
            let sibling = label.nextElementSibling;
            while (sibling && !input) {
                input = sibling.querySelector("input, textarea") || (sibling.tagName === "INPUT" || sibling.tagName === "TEXTAREA" ? sibling : null);
                if (input) return input;
                sibling = sibling.nextElementSibling;
            }
        }

        return null;
    }

    function findDateInputs(block, dateType) {
        // dateType is "startDate" or "endDate"
        if (!block) return { month: null, year: null };

        // Workday uses aria-label for Month and Year inputs
        const allMonthInputs = [...block.querySelectorAll('input[aria-label="Month"][data-automation-id="dateSectionMonth-input"]')];
        const allYearInputs = [...block.querySelectorAll('input[aria-label="Year"][data-automation-id="dateSectionYear-input"]')];

        // Match by ID containing startDate or endDate
        const monthInput = allMonthInputs.find(inp => inp.id && inp.id.includes(dateType));
        const yearInput = allYearInputs.find(inp => inp.id && inp.id.includes(dateType));

        return {
            month: monthInput || null,
            year: yearInput || null
        };
    }

    function fillExperienceBlock(block, data, blockIndex) {
        if (!block) {
            console.error(`❌ No experience block found for index ${blockIndex}`);
            return;
        }

        console.log(`\n📝 Filling experience block ${blockIndex + 1}...`);

        // Find inputs by name attribute
        const jobTitleInput = findInputByName(block, "jobTitle");
        const companyInput = findInputByName(block, "companyName");
        const locationInput = findInputByName(block, "location");
        const currentlyWorkingCheckbox = findInputByName(block, "currentlyWorkHere");
        const descriptionInput = findInputByLabel(block, "Role Description");

        console.log(`🔎 Found inputs:`, {
            jobTitle: !!jobTitleInput,
            company: !!companyInput,
            location: !!locationInput,
            checkbox: !!currentlyWorkingCheckbox,
            description: !!descriptionInput
        });

        // Fill basic fields
        if (jobTitleInput) {
            setValue(jobTitleInput, data.jobTitle);
            console.log(`✓ Job Title: ${data.jobTitle}`);
        } else {
            console.warn("⚠ Job Title field not found");
        }

        if (companyInput) {
            setValue(companyInput, data.company);
            console.log(`✓ Company: ${data.company}`);
        } else {
            console.warn("⚠ Company field not found");
        }

        if (locationInput) {
            setValue(locationInput, data.location);
            console.log(`✓ Location: ${data.location}`);
        } else {
            console.warn("⚠ Location field not found");
        }

        if (currentlyWorkingCheckbox) {
            setCheckbox(currentlyWorkingCheckbox, data.currentlyWorking);
            console.log(`✓ Currently working: ${data.currentlyWorking}`);
        }

        // Scroll and fill dates + description
        setTimeout(() => {
            block.scrollIntoView({ behavior: "smooth", block: "center" });

            // Find date inputs (MM/YYYY format with separate month/year inputs)
            const startDate = findDateInputs(block, "startDate");
            const endDate = findDateInputs(block, "endDate");

            console.log(`🔎 Found date inputs:`, {
                startMonth: startDate.month ? `✓ (id: ${startDate.month.id})` : '✗',
                startYear: startDate.year ? `✓ (id: ${startDate.year.id})` : '✗',
                endMonth: endDate.month ? `✓ (id: ${endDate.month.id})` : '✗',
                endYear: endDate.year ? `✓ (id: ${endDate.year.id})` : '✗'
            });

            if (startDate.month) {
                const success = setValue(startDate.month, data.fromMonth);
                console.log(`${success ? '✓' : '✗'} Start Month: ${data.fromMonth}`);
            } else {
                console.warn("⚠ Start month field not found");
            }

            if (startDate.year) {
                const success = setValue(startDate.year, data.fromYear);
                console.log(`${success ? '✓' : '✗'} Start Year: ${data.fromYear}`);
            } else {
                console.warn("⚠ Start year field not found");
            }

            if (!data.currentlyWorking) {
                if (endDate.month) {
                    const success = setValue(endDate.month, data.toMonth);
                    console.log(`${success ? '✓' : '✗'} End Month: ${data.toMonth}`);
                } else {
                    console.warn("⚠ End month field not found");
                }

                if (endDate.year) {
                    const success = setValue(endDate.year, data.toYear);
                    console.log(`${success ? '✓' : '✗'} End Year: ${data.toYear}`);
                } else {
                    console.warn("⚠ End year field not found");
                }
            } else {
                console.log("ℹ Skipping end date (currently working)");
            }

            if (descriptionInput) {
                setValue(descriptionInput, data.description);
                console.log(`✓ Description filled`);
            } else {
                console.warn("⚠ Description field not found");
            }
        }, 500);
    }

    (async function run() {
        console.log("🚀 Starting work experience automation...\n");

        // Get all existing blocks
        const allBlocks = getAllExperienceBlocks();
        console.log(`Found ${allBlocks.length} existing work experience blocks\n`);

        if (allBlocks.length === 0) {
            console.error("❌ No work experience blocks found on the page!");
            console.log("Please make sure you are on the Work Experience section");
            return;
        }

        // Fill only the number of experiences we have data for
        const blocksToFill = Math.min(experiences.length, allBlocks.length);

        for (let i = 0; i < blocksToFill; i++) {
            console.log(`\n═══════════════════════════════════`);
            console.log(`Processing experience ${i + 1}/${blocksToFill}...`);
            console.log(`═══════════════════════════════════`);

            const block = allBlocks[i].container;
            fillExperienceBlock(block, experiences[i], i);

            await new Promise(r => setTimeout(r, 1500)); // Give time for fields to settle
        }

        console.log("\n═══════════════════════════════════");
        console.log("✅ All work experiences filled!");
        console.log("═══════════════════════════════════");
        console.log("\n👉 Next step: Review the filled data and click 'Save and Continue' button");
    })();
})();
