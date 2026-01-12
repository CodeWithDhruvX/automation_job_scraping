(function () {
    'use strict';

    console.log("🎓 Workday Education & Languages Auto-Fill");
    console.log("==========================================\n");

    // ============================================
    // CONFIGURATION - UPDATE WITH YOUR DETAILS
    // ============================================

    const educationData = [
        {
            school: "St.Xavier College",
            degree: "Bachelors in Engineering", // Options: High School, Bachelor of Science, Bachelor of Arts, Master of Science, etc.
            fieldOfStudy: "Computer Science"
        },
        {
            school: "R.B Instititute of management studies",
            degree: "Masters in Engineering", // For Indian education system
            fieldOfStudy: "Computer Engineering"
        }
    ];

    const languagesData = [
        {
            language: "English", // Must match dropdown exactly
            fluent: false,
            overall: "Intermediate" // Options: Beginner, Intermediate, Advanced, Fluent
        },
        {
            language: "Hindi",
            fluent: true,
            overall: "Fluent"
        },
        {
            language: "Gujarati",
            fluent: true,
            overall: "Fluent"
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

    async function selectFromDropdown(buttonElement, optionText) {
        try {
            // Close any open dropdowns first
            document.body.click();
            await delay(300);

            // Scroll button into view and click
            buttonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(200);
            buttonElement.click();
            console.log(`  🔽 Opening dropdown...`);
            await delay(1000);

            // Use aria-controls to find the CORRECT listbox for this specific button
            const controlsId = buttonElement.getAttribute('aria-controls');
            let listbox = null;

            if (controlsId) {
                listbox = document.getElementById(controlsId);
                console.log(`  🎯 Using aria-controls: ${controlsId}`);
            }

            // Fallback: find visible listbox if aria-controls doesn't work
            if (!listbox) {
                console.log(`  ⚠️  No aria-controls, searching for visible listbox...`);
                const allListboxes = document.querySelectorAll('[role="listbox"]');
                for (const lb of allListboxes) {
                    if (lb.offsetParent !== null) { // Check if visible
                        listbox = lb;
                        break;
                    }
                }
            }

            if (!listbox) {
                console.error("  ❌ Dropdown menu not found!");
                return false;
            }

            // Find all options in this specific listbox
            const options = listbox.querySelectorAll('[role="option"]');
            console.log(`  📋 Found ${options.length} options in listbox`);

            // Find matching option (exact match first, then partial)
            let selectedOption = null;

            // Try exact match first
            for (const option of options) {
                if (option.textContent.trim() === optionText) {
                    selectedOption = option;
                    break;
                }
            }

            // Try partial match if exact match not found
            if (!selectedOption) {
                for (const option of options) {
                    if (option.textContent.trim().includes(optionText)) {
                        selectedOption = option;
                        break;
                    }
                }
            }

            if (selectedOption) {
                console.log(`  ✓ Selecting: ${selectedOption.textContent.trim()}`);
                selectedOption.click();
                await delay(500);
                return true;
            }

            console.error(`  ❌ Option "${optionText}" not found in dropdown!`);
            console.log(`  Available options: ${Array.from(options).slice(0, 10).map(o => o.textContent.trim()).join(', ')}${options.length > 10 ? '...' : ''}`);
            return false;

        } catch (e) {
            console.error("  ❌ Error selecting dropdown:", e);
            return false;
        }
    }

    // ============================================
    // EDUCATION SECTION
    // ============================================

    function getAllEducationBlocks() {
        const blocks = [];

        // Find all inputs with name="schoolName"
        const schoolInputs = document.querySelectorAll('input[name="schoolName"]');

        schoolInputs.forEach((input, index) => {
            // Get the parent container (usually 3-4 levels up)
            let container = input;
            for (let i = 0; i < 5; i++) {
                if (container.parentElement) {
                    container = container.parentElement;
                }
            }

            blocks.push({
                index: index + 1,
                container: container,
                schoolInput: input
            });
        });

        return blocks;
    }

    async function fillEducationBlock(blockData, eduData) {
        const block = blockData.container;
        const index = blockData.index;

        console.log(`\n📚 Filling Education ${index}...`);

        try {
            // 1. School or University
            const schoolInput = block.querySelector('input[name="schoolName"]');
            if (schoolInput) {
                setValue(schoolInput, eduData.school);
                console.log(`  ✓ School: ${eduData.school}`);
                await delay(500);
            } else {
                console.error(`  ❌ School input not found`);
            }

            // 2. Degree (Dropdown)
            const degreeButton = block.querySelector('button[name="degree"]');
            if (degreeButton) {
                console.log(`  📝 Selecting Degree: ${eduData.degree}`);
                await selectFromDropdown(degreeButton, eduData.degree);
                await delay(500);
            } else {
                console.error(`  ❌ Degree dropdown not found`);
            }

            // 3. Field of Study (Searchable input)
            const fieldInput = block.querySelector('input[id$="--fieldOfStudy"]');
            if (fieldInput) {
                setValue(fieldInput, eduData.fieldOfStudy);
                console.log(`  ✓ Field of Study: ${eduData.fieldOfStudy}`);
                await delay(500);
            } else {
                console.error(`  ❌ Field of Study input not found`);
            }

            console.log(`  ✅ Education ${index} completed!`);

        } catch (e) {
            console.error(`  ❌ Error filling education block ${index}:`, e);
        }
    }

    async function fillEducation() {
        console.log("\n" + "=".repeat(50));
        console.log("🎓 FILLING EDUCATION SECTION");
        console.log("=".repeat(50));

        const educationBlocks = getAllEducationBlocks();
        console.log(`\n📊 Found ${educationBlocks.length} education block(s)`);

        if (educationBlocks.length === 0) {
            console.error("\n❌ No education blocks found!");
            console.log("💡 Make sure you've clicked the 'Add' button to show education fields.");
            return;
        }

        // Fill each education block
        const blocksToFill = Math.min(educationData.length, educationBlocks.length);

        for (let i = 0; i < blocksToFill; i++) {
            await fillEducationBlock(educationBlocks[i], educationData[i]);
            await delay(800);
        }

        // Check if we need more blocks
        if (educationData.length > educationBlocks.length) {
            console.log(`\n⚠️  You have ${educationData.length} education entries but only ${educationBlocks.length} block(s).`);
            console.log(`💡 Click "Add Another" to add more education blocks.`);
        }

        console.log("\n✅ Education section filling complete!");
    }

    // ============================================
    // LANGUAGES SECTION
    // ============================================

    function getAllLanguageBlocks() {
        const blocks = [];

        // Find all dropdowns with name="language"
        const languageButtons = document.querySelectorAll('button[name="language"]');

        languageButtons.forEach((button, index) => {
            // Get the parent container
            let container = button;
            for (let i = 0; i < 5; i++) {
                if (container.parentElement) {
                    container = container.parentElement;
                }
            }

            blocks.push({
                index: index + 1,
                container: container,
                languageButton: button
            });
        });

        return blocks;
    }

    async function fillLanguageBlock(blockData, langData) {
        const block = blockData.container;
        const index = blockData.index;

        console.log(`\n🌐 Filling Language ${index}...`);

        try {
            // 1. Language (Dropdown)
            const languageButton = block.querySelector('button[name="language"]');
            if (languageButton) {
                console.log(`  📝 Selecting Language: ${langData.language}`);
                await selectFromDropdown(languageButton, langData.language);
                await delay(500);
            } else {
                console.error(`  ❌ Language dropdown not found`);
            }

            // 2. Fluent Checkbox
            const fluentCheckbox = block.querySelector('input[name="native"]');
            if (fluentCheckbox) {
                setCheckbox(fluentCheckbox, langData.fluent);
                console.log(`  ✓ Fluent: ${langData.fluent}`);
                await delay(300);
            } else {
                console.error(`  ❌ Fluent checkbox not found`);
            }

            // 3. Overall Proficiency (Dropdown)
            // Find by looking for a label with "Overall" text
            const labels = block.querySelectorAll('label');
            let overallButton = null;

            for (const label of labels) {
                if (label.textContent.includes('Overall')) {
                    const parent = label.closest('[data-automation-id^="formField"]');
                    if (parent) {
                        overallButton = parent.querySelector('button');
                        break;
                    }
                }
            }

            if (overallButton) {
                console.log(`  📝 Selecting Overall Proficiency: ${langData.overall}`);
                await selectFromDropdown(overallButton, langData.overall);
                await delay(500);
            } else {
                console.error(`  ❌ Overall proficiency dropdown not found`);
            }

            console.log(`  ✅ Language ${index} completed!`);

        } catch (e) {
            console.error(`  ❌ Error filling language block ${index}:`, e);
        }
    }

    async function fillLanguages() {
        console.log("\n" + "=".repeat(50));
        console.log("🗣️  FILLING LANGUAGES SECTION");
        console.log("=".repeat(50));

        const languageBlocks = getAllLanguageBlocks();
        console.log(`\n📊 Found ${languageBlocks.length} language block(s)`);

        if (languageBlocks.length === 0) {
            console.error("\n❌ No language blocks found!");
            console.log("💡 Make sure you've clicked the 'Add' button to show language fields.");
            return;
        }

        // Fill each language block
        const blocksToFill = Math.min(languagesData.length, languageBlocks.length);

        for (let i = 0; i < blocksToFill; i++) {
            await fillLanguageBlock(languageBlocks[i], languagesData[i]);
            await delay(800);
        }

        // Check if we need more blocks
        if (languagesData.length > languageBlocks.length) {
            console.log(`\n⚠️  You have ${languagesData.length} language entries but only ${languageBlocks.length} block(s).`);
            console.log(`💡 Click "Add Another" to add more language blocks.`);
        }

        console.log("\n✅ Languages section filling complete!");
    }

    // ============================================
    // MAIN EXECUTION
    // ============================================

    async function autoFillEducationAndLanguages() {
        try {
            console.log("🚀 Starting Education & Languages auto-fill...\n");

            // Fill Education
            await fillEducation();

            await delay(1000);

            // Fill Languages
            await fillLanguages();

            // Final summary
            console.log("\n" + "=".repeat(50));
            console.log("🎉 AUTO-FILL COMPLETE!");
            console.log("=".repeat(50));
            console.log("\n📋 Next Steps:");
            console.log("  1. ✅ Review all filled information");
            console.log("  2. ✅ Make any necessary corrections");
            console.log("  3. ✅ Click 'Save and Continue' to proceed");
            console.log("\n💡 Tips:");
            console.log("  - If some fields didn't fill, you can re-run this script");
            console.log("  - Update the configuration at the top of the script with your data");
            console.log("  - Make sure dropdown values match exactly (case-sensitive)");

        } catch (error) {
            console.error("\n❌ ERROR:", error);
            console.log("\n🔧 Troubleshooting:");
            console.log("  1. Make sure you're on the correct page section");
            console.log("  2. Verify that education/language blocks are visible (click 'Add' buttons)");
            console.log("  3. Check browser console for specific error messages");
        }
    }

    // Start the automation
    autoFillEducationAndLanguages();

})();
