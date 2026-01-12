(function () {
    'use strict';

    console.log("🚀 Workday Application Auto-Fill Script Loaded!");
    console.log("================================================\n");

    // ============================================
    // CONFIGURATION - UPDATE WITH YOUR DETAILS
    // ============================================

    const personalInfo = {
        // Source Information
        howDidYouHear: "LinkedIn", // or "Company Website", "Referral", etc.
        previouslyEmployed: "No", // "Yes" or "No"

        // Personal Information
        country: "India",
        firstName: "Dhruv",
        lastName: "Shah",
        localFirstName: "", // Optional
        localLastName: "", // Optional

        // Address
        addressLine1: "123 Main Street",
        addressLine2: "Apartment 4B",
        addressLine3: "", // Optional
        city: "Bangalore",
        postalCode: "560001",
        state: "Karnataka",

        // Contact
        phoneDeviceType: "Mobile", // "Mobile", "Home", or "Work"
        phoneCountryCode: "+91",
        phoneNumber: "9876543210",
        phoneExtension: "" // Optional
    };

    const workExperiences = [
        {
            jobTitle: "Senior Engineer",
            company: "Ascendion Pvt. Ltd.",
            location: "Bangalore, India",
            fromMonth: "08",
            fromYear: "2024",
            toMonth: "",
            toYear: "",
            currentlyWorking: true,
            description: `Project: Insight Governance (Client: KPMG)
• Spearheaded integration of PowerBI dashboards into the client-facing UI, enhancing data visualization and decision-making processes, resulting in 15% increase in operational efficiency.
• Architected and deployed containerized microservices using Docker and Kubernetes on Azure Kubernetes Service (AKS).
• Designed and implemented a high-throughput file upload and processing pipeline using Azure Blob Storage and async messaging.
• Developed automated CI/CD pipelines in Azure DevOps with SonarLint quality gates and automated testing.`
        },
        {
            jobTitle: "Senior Engineer",
            company: "Ascendion Pvt. Ltd.",
            location: "Bangalore, India",
            fromMonth: "03",
            fromYear: "2023",
            toMonth: "07",
            toYear: "2024",
            currentlyWorking: false,
            description: `Project: KPMG Audit Platform
• Led backend architecture using Spring Boot & Spring Cloud.
• Implemented RBAC and input validation with Spring Security and Hibernate Validator.
• Built reusable services improving development speed by 25%.
• Improved test coverage with JUnit & Mockito in Agile environment.`
        }
    ];

    const education = [
        {
            school: "Gujarat Technological University",
            degree: "Bachelor's Degree", // Match Workday dropdown options
            fieldOfStudy: "Computer Science"
        },
        {
            school: "ABC Higher Secondary School",
            degree: "High School Diploma",
            fieldOfStudy: "Science"
        }
    ];

    const languages = [
        {
            language: "English",
            fluent: true,
            overall: "Advanced" // Options: "Elementary", "Intermediate", "Advanced", "Native"
        },
        {
            language: "Hindi",
            fluent: true,
            overall: "Native"
        }
    ];

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function setValue(el, value) {
        if (!el) return false;
        try {
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
            console.error("❌ Error setting value:", e);
            return false;
        }
    }

    function setCheckbox(el, checked) {
        if (!el) return false;
        try {
            if (el.checked !== checked) {
                el.click();
            }
            return true;
        } catch (e) {
            console.error("❌ Error setting checkbox:", e);
            return false;
        }
    }

    function clickRadioButton(value) {
        try {
            const radios = document.querySelectorAll('input[type="radio"]');
            for (const radio of radios) {
                const label = document.querySelector(`label[for="${radio.id}"]`);
                if (label && label.textContent.trim() === value) {
                    radio.click();
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("❌ Error clicking radio:", e);
            return false;
        }
    }

    async function selectDropdownOption(dropdownButton, optionText) {
        try {
            // Click the dropdown to open it
            dropdownButton.click();
            await delay(500);

            // Find the option in the dropdown
            const options = document.querySelectorAll('[role="option"], [role="listitem"]');
            for (const option of options) {
                if (option.textContent.trim().includes(optionText)) {
                    option.click();
                    await delay(300);
                    return true;
                }
            }

            // If not found, try typing and selecting
            const input = document.querySelector('input[role="combobox"]:focus, input[type="text"]:focus');
            if (input) {
                setValue(input, optionText);
                await delay(500);

                const firstOption = document.querySelector('[role="option"]');
                if (firstOption) {
                    firstOption.click();
                    await delay(300);
                    return true;
                }
            }

            return false;
        } catch (e) {
            console.error("❌ Error selecting dropdown:", e);
            return false;
        }
    }

    function findInputById(id) {
        return document.querySelector(`#${id}, [id*="${id}"]`);
    }

    function findInputByLabel(labelText) {
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
            if (label.textContent.trim().includes(labelText)) {
                const forId = label.getAttribute('for');
                if (forId) {
                    return document.getElementById(forId);
                }
                const input = label.querySelector('input, textarea, select');
                if (input) return input;
            }
        }
        return null;
    }

    function findButtonByText(text) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.trim().includes(text)) {
                return btn;
            }
        }
        return null;
    }

    // ============================================
    // SECTION 1: MY INFORMATION
    // ============================================

    async function fillMyInformation() {
        console.log("\n📝 SECTION 1: MY INFORMATION");
        console.log("================================");

        // How Did You Hear About Us
        const howDidYouHearLabel = findInputByLabel("How Did You Hear About Us");
        if (howDidYouHearLabel) {
            console.log("✓ Filling 'How Did You Hear About Us'");
            await selectDropdownOption(howDidYouHearLabel, personalInfo.howDidYouHear);
            await delay(500);
        }

        // Previous Employment
        if (personalInfo.previouslyEmployed === "No") {
            const noRadio = document.querySelector('input[type="radio"][id*="No"]');
            if (noRadio) {
                noRadio.click();
                console.log("✓ Selected 'No' for previous employment");
            }
        }
        await delay(500);

        // Country
        const countryDropdown = findInputById("country--country");
        if (countryDropdown) {
            console.log("✓ Selecting country");
            await selectDropdownOption(countryDropdown, personalInfo.country);
            await delay(500);
        }

        // First Name
        const firstName = findInputById("name--legalName--firstName");
        if (firstName) {
            setValue(firstName, personalInfo.firstName);
            console.log(`✓ First Name: ${personalInfo.firstName}`);
        }

        // Last Name
        const lastName = findInputById("name--legalName--lastName");
        if (lastName) {
            setValue(lastName, personalInfo.lastName);
            console.log(`✓ Last Name: ${personalInfo.lastName}`);
        }

        // Address
        const addr1 = findInputById("address--addressLine1");
        if (addr1) {
            setValue(addr1, personalInfo.addressLine1);
            console.log(`✓ Address Line 1: ${personalInfo.addressLine1}`);
        }

        const addr2 = findInputById("address--addressLine2");
        if (addr2) {
            setValue(addr2, personalInfo.addressLine2);
            console.log(`✓ Address Line 2: ${personalInfo.addressLine2}`);
        }

        const addr3 = findInputById("address--addressLine3");
        if (addr3 && personalInfo.addressLine3) {
            setValue(addr3, personalInfo.addressLine3);
            console.log(`✓ Address Line 3: ${personalInfo.addressLine3}`);
        }

        const city = findInputById("address--city");
        if (city) {
            setValue(city, personalInfo.city);
            console.log(`✓ City: ${personalInfo.city}`);
        }

        const postalCode = findInputById("address--postalCode");
        if (postalCode) {
            setValue(postalCode, personalInfo.postalCode);
            console.log(`✓ Postal Code: ${personalInfo.postalCode}`);
        }

        const state = findInputById("address--countryRegion");
        if (state) {
            console.log("✓ Selecting state");
            await selectDropdownOption(state, personalInfo.state);
            await delay(500);
        }

        // Phone
        const phoneType = findInputById("phoneNumber--phoneType");
        if (phoneType) {
            console.log("✓ Selecting phone type");
            await selectDropdownOption(phoneType, personalInfo.phoneDeviceType);
            await delay(500);
        }

        const phoneNumber = findInputById("phoneNumber--phoneNumber");
        if (phoneNumber) {
            setValue(phoneNumber, personalInfo.phoneNumber);
            console.log(`✓ Phone Number: ${personalInfo.phoneNumber}`);
        }

        console.log("✅ My Information section filled!");
        await delay(1000);
    }

    // ============================================
    // SECTION 2: MY EXPERIENCE
    // ============================================

    function getAllExperienceBlocks() {
        const blocks = [];
        const headings = document.querySelectorAll("h3, h4, h5");

        for (const heading of headings) {
            const headingText = heading.textContent.trim();
            if (/Work Experience \d+/.test(headingText)) {
                const container = heading.parentElement?.parentElement;
                if (container) {
                    blocks.push({ heading, container, text: headingText });
                }
            }
        }
        return blocks;
    }

    function findInputInBlock(block, nameAttr) {
        if (!block) return null;
        return block.querySelector(`input[name="${nameAttr}"], textarea[name="${nameAttr}"]`);
    }

    function findDateInputs(block, dateType) {
        if (!block) return { month: null, year: null };

        const allMonthInputs = [...block.querySelectorAll('input[aria-label="Month"][data-automation-id="dateSectionMonth-input"]')];
        const allYearInputs = [...block.querySelectorAll('input[aria-label="Year"][data-automation-id="dateSectionYear-input"]')];

        const monthInput = allMonthInputs.find(inp => inp.id && inp.id.includes(dateType));
        const yearInput = allYearInputs.find(inp => inp.id && inp.id.includes(dateType));

        return { month: monthInput, year: yearInput };
    }

    function findDescriptionInput(block) {
        const labels = block.querySelectorAll("label");
        for (const label of labels) {
            if (label.textContent.trim().includes("Role Description")) {
                const forId = label.getAttribute("for");
                if (forId) {
                    return block.querySelector(`#${forId}`);
                }
                return label.querySelector("textarea") || label.nextElementSibling?.querySelector("textarea");
            }
        }
        return null;
    }

    async function fillExperienceBlock(block, data, index) {
        if (!block) return;

        console.log(`\n📝 Filling Work Experience ${index + 1}...`);

        // Job Title
        const jobTitle = findInputInBlock(block, "jobTitle");
        if (jobTitle) {
            setValue(jobTitle, data.jobTitle);
            console.log(`  ✓ Job Title: ${data.jobTitle}`);
        }

        // Company
        const company = findInputInBlock(block, "companyName");
        if (company) {
            setValue(company, data.company);
            console.log(`  ✓ Company: ${data.company}`);
        }

        // Location
        const location = findInputInBlock(block, "location");
        if (location) {
            setValue(location, data.location);
            console.log(`  ✓ Location: ${data.location}`);
        }

        // Currently Working
        const currentlyWorking = findInputInBlock(block, "currentlyWorkHere");
        if (currentlyWorking) {
            setCheckbox(currentlyWorking, data.currentlyWorking);
            console.log(`  ✓ Currently Working: ${data.currentlyWorking}`);
        }

        await delay(500);

        // Start Date
        const startDate = findDateInputs(block, "startDate");
        if (startDate.month) {
            setValue(startDate.month, data.fromMonth);
            console.log(`  ✓ Start Month: ${data.fromMonth}`);
        }
        if (startDate.year) {
            setValue(startDate.year, data.fromYear);
            console.log(`  ✓ Start Year: ${data.fromYear}`);
        }

        // End Date (if not currently working)
        if (!data.currentlyWorking) {
            const endDate = findDateInputs(block, "endDate");
            if (endDate.month) {
                setValue(endDate.month, data.toMonth);
                console.log(`  ✓ End Month: ${data.toMonth}`);
            }
            if (endDate.year) {
                setValue(endDate.year, data.toYear);
                console.log(`  ✓ End Year: ${data.toYear}`);
            }
        }

        // Description
        const description = findDescriptionInput(block);
        if (description) {
            setValue(description, data.description);
            console.log(`  ✓ Description filled`);
        }

        await delay(500);
    }

    async function fillMyExperience() {
        console.log("\n💼 SECTION 2: MY EXPERIENCE");
        console.log("================================");

        const experienceBlocks = getAllExperienceBlocks();
        console.log(`Found ${experienceBlocks.length} experience blocks`);

        const blocksToFill = Math.min(workExperiences.length, experienceBlocks.length);

        for (let i = 0; i < blocksToFill; i++) {
            await fillExperienceBlock(experienceBlocks[i].container, workExperiences[i], i);
            await delay(1000);
        }

        console.log("✅ My Experience section filled!");
    }

    // ============================================
    // SECTION 3: EDUCATION
    // ============================================

    function getAllEducationBlocks() {
        const blocks = [];
        const headings = document.querySelectorAll("h3, h4, h5");

        for (const heading of headings) {
            const headingText = heading.textContent.trim();
            if (/Education \d+/.test(headingText)) {
                const container = heading.parentElement?.parentElement;
                if (container) {
                    blocks.push({ heading, container, text: headingText });
                }
            }
        }
        return blocks;
    }

    async function fillEducationBlock(block, data, index) {
        if (!block) return;

        console.log(`\n📚 Filling Education ${index + 1}...`);

        // School or University
        const schoolInput = block.querySelector('input[name*="school"], input[id*="school"]');
        if (schoolInput) {
            setValue(schoolInput, data.school);
            console.log(`  ✓ School: ${data.school}`);
        }

        await delay(500);

        // Degree (dropdown)
        const degreeDropdown = block.querySelector('button[data-automation-id*="degree"], select[name*="degree"]');
        if (degreeDropdown) {
            console.log(`  ✓ Selecting Degree: ${data.degree}`);
            await selectDropdownOption(degreeDropdown, data.degree);
            await delay(500);
        }

        // Field of Study
        const fieldInput = block.querySelector('input[name*="field"], input[id*="field"]');
        if (fieldInput) {
            setValue(fieldInput, data.fieldOfStudy);
            console.log(`  ✓ Field of Study: ${data.fieldOfStudy}`);
        }

        await delay(500);
    }

    async function fillEducation() {
        console.log("\n🎓 SECTION 3: EDUCATION");
        console.log("================================");

        const educationBlocks = getAllEducationBlocks();
        console.log(`Found ${educationBlocks.length} education blocks`);

        const blocksToFill = Math.min(education.length, educationBlocks.length);

        for (let i = 0; i < blocksToFill; i++) {
            await fillEducationBlock(educationBlocks[i].container, education[i], i);
            await delay(1000);
        }

        console.log("✅ Education section filled!");
    }

    // ============================================
    // SECTION 4: LANGUAGES
    // ============================================

    function getAllLanguageBlocks() {
        const blocks = [];
        const headings = document.querySelectorAll("h3, h4, h5");

        for (const heading of headings) {
            const headingText = heading.textContent.trim();
            if (/Languages? \d+/.test(headingText)) {
                const container = heading.parentElement?.parentElement;
                if (container) {
                    blocks.push({ heading, container, text: headingText });
                }
            }
        }
        return blocks;
    }

    async function fillLanguageBlock(block, data, index) {
        if (!block) return;

        console.log(`\n🌐 Filling Language ${index + 1}...`);

        // Language (dropdown)
        const languageDropdown = block.querySelector('button[data-automation-id*="language"], select[name*="language"]');
        if (languageDropdown) {
            console.log(`  ✓ Selecting Language: ${data.language}`);
            await selectDropdownOption(languageDropdown, data.language);
            await delay(500);
        }

        // Fluent checkbox
        const fluentCheckbox = block.querySelector('input[type="checkbox"]');
        if (fluentCheckbox) {
            setCheckbox(fluentCheckbox, data.fluent);
            console.log(`  ✓ Fluent: ${data.fluent}`);
        }

        await delay(500);

        // Overall proficiency (dropdown)
        const overallDropdown = block.querySelector('button[data-automation-id*="overall"], select[name*="overall"]');
        if (overallDropdown) {
            console.log(`  ✓ Selecting Proficiency: ${data.overall}`);
            await selectDropdownOption(overallDropdown, data.overall);
            await delay(500);
        }

        await delay(500);
    }

    async function fillLanguages() {
        console.log("\n🗣️ SECTION 4: LANGUAGES");
        console.log("================================");

        const languageBlocks = getAllLanguageBlocks();
        console.log(`Found ${languageBlocks.length} language blocks`);

        const blocksToFill = Math.min(languages.length, languageBlocks.length);

        for (let i = 0; i < blocksToFill; i++) {
            await fillLanguageBlock(languageBlocks[i].container, languages[i], i);
            await delay(1000);
        }

        console.log("✅ Languages section filled!");
    }

    // ============================================
    // NAVIGATION HELPERS
    // ============================================

    async function clickSaveAndContinue() {
        const saveBtn = findButtonByText("Save and Continue");
        if (saveBtn) {
            console.log("\n⏭️  Clicking 'Save and Continue'...");
            saveBtn.click();
            await delay(2000); // Wait for page transition
            return true;
        }
        return false;
    }

    function getCurrentSection() {
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
        if (activeTab) {
            return activeTab.textContent.trim();
        }
        return "Unknown";
    }

    // ============================================
    // MAIN EXECUTION
    // ============================================

    async function autoFillApplication() {
        try {
            const currentSection = getCurrentSection();
            console.log(`📍 Current Section: ${currentSection}\n`);

            if (currentSection.includes("My Information")) {
                await fillMyInformation();
                console.log("\n✅ Section completed! You can now click 'Save and Continue' manually or wait...");
                await delay(2000);
                // Uncomment to auto-advance: await clickSaveAndContinue();
            }
            else if (currentSection.includes("My Experience")) {
                await fillMyExperience();
                console.log("\n✅ Section completed! You can now click 'Save and Continue' manually or wait...");
                await delay(2000);
                // Uncomment to auto-advance: await clickSaveAndContinue();
            }
            else if (currentSection.includes("Education") || currentSection.includes("Application Questions")) {
                // Try to fill education
                await fillEducation();
                await delay(1000);
                await fillLanguages();
                console.log("\n✅ Education & Languages completed! Review and click 'Save and Continue'");
            }
            else {
                console.log("⚠️  Unknown section or sections not yet automated.");
                console.log("Available automation:");
                console.log("  - My Information");
                console.log("  - My Experience");
                console.log("  - Education");
                console.log("  - Languages");
            }

            console.log("\n" + "=".repeat(50));
            console.log("🎉 AUTO-FILL COMPLETE!");
            console.log("=".repeat(50));
            console.log("\n📋 Next Steps:");
            console.log("  1. Review all filled information");
            console.log("  2. Make any necessary corrections");
            console.log("  3. Click 'Save and Continue' to proceed");
            console.log("  4. Re-run this script on the next page if needed");

        } catch (error) {
            console.error("\n❌ ERROR:", error);
            console.log("Please check the console for details and try again.");
        }
    }

    // Start the automation
    autoFillApplication();

})();
