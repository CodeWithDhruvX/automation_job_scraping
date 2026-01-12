// DIAGNOSTIC SCRIPT - Run this in console to see what's on the page
(function () {
    console.log("🔍 STARTING DIAGNOSTIC SCAN...\n");

    // 1. Find all headings that might be "Work Experience"
    console.log("=== SCANNING FOR HEADINGS ===");
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, label, legend, div[data-automation-id*="header"], div[data-automation-id*="title"]');
    const workExpHeadings = Array.from(allHeadings).filter(h =>
        /work\s*experience/i.test(h.textContent) &&
        h.textContent.trim().length < 100
    );

    console.log(`Found ${workExpHeadings.length} potential work experience headings:`);
    workExpHeadings.forEach((h, i) => {
        console.log(`\n[${i + 1}] "${h.textContent.trim()}"`);
        console.log(`   Tag: ${h.tagName}`);
        console.log(`   data-automation-id: ${h.getAttribute('data-automation-id')}`);
        console.log(`   Parent: ${h.parentElement.tagName}.${h.parentElement.className}`);
    });

    // 2. Try to find containers
    console.log("\n\n=== SEARCHING FOR CONTAINERS ===");
    const potentialContainers = [
        ...document.querySelectorAll('fieldset'),
        ...document.querySelectorAll('[data-automation-id*="experience"]'),
        ...document.querySelectorAll('[data-automation-id*="section"]'),
        ...document.querySelectorAll('[class*="experience"]'),
        ...document.querySelectorAll('[class*="section"]')
    ];

    console.log(`Found ${potentialContainers.length} potential containers`);
    const uniqueContainers = [...new Set(potentialContainers)];
    console.log(`Unique containers: ${uniqueContainers.length}`);

    uniqueContainers.forEach((container, i) => {
        const inputs = container.querySelectorAll('input, textarea');
        if (inputs.length > 3) {
            console.log(`\n[Container ${i + 1}]`);
            console.log(`   Tag: ${container.tagName}`);
            console.log(`   data-automation-id: ${container.getAttribute('data-automation-id')}`);
            console.log(`   class: ${container.className.substring(0, 50)}...`);
            console.log(`   Inputs inside: ${inputs.length}`);

            // Show first few inputs
            Array.from(inputs).slice(0, 5).forEach(inp => {
                console.log(`     • ${inp.type}: data-automation-id="${inp.getAttribute('data-automation-id')}" name="${inp.name}" placeholder="${inp.placeholder}"`);
            });
        }
    });

    // 3. Find all buttons
    console.log("\n\n=== SCANNING FOR BUTTONS ===");
    const allButtons = document.querySelectorAll('button');
    const addButtons = Array.from(allButtons).filter(b =>
        /add/i.test(b.textContent) &&
        (/work|experience|another/i.test(b.textContent) ||
            /add/i.test(b.getAttribute('data-automation-id') || ''))
    );

    console.log(`Found ${addButtons.length} potential "Add" buttons:`);
    addButtons.forEach((btn, i) => {
        console.log(`\n[Button ${i + 1}] "${btn.textContent.trim()}"`);
        console.log(`   data-automation-id: ${btn.getAttribute('data-automation-id')}`);
        console.log(`   aria-label: ${btn.getAttribute('aria-label')}`);
    });

    // 4. Find all text inputs with labels
    console.log("\n\n=== SCANNING FOR INPUT FIELDS ===");
    const relevantInputs = document.querySelectorAll('input[data-automation-id*="jobTitle"], input[data-automation-id*="company"], input[data-automation-id*="location"], input[data-automation-id*="title"], textarea[data-automation-id*="description"]');

    console.log(`Found ${relevantInputs.length} potentially relevant inputs:`);
    Array.from(relevantInputs).forEach((inp, i) => {
        console.log(`\n[Input ${i + 1}]`);
        console.log(`   Type: ${inp.type || inp.tagName}`);
        console.log(`   data-automation-id: ${inp.getAttribute('data-automation-id')}`);
        console.log(`   name: ${inp.name}`);
        console.log(`   placeholder: ${inp.placeholder}`);
        console.log(`   value: ${inp.value}`);
    });

    // 5. Check current page structure
    console.log("\n\n=== PAGE STRUCTURE INFO ===");
    console.log(`Total inputs on page: ${document.querySelectorAll('input').length}`);
    console.log(`Total textareas on page: ${document.querySelectorAll('textarea').length}`);
    console.log(`Total buttons on page: ${document.querySelectorAll('button').length}`);
    console.log(`Total fieldsets on page: ${document.querySelectorAll('fieldset').length}`);

    console.log("\n✅ DIAGNOSTIC COMPLETE!");
    console.log("\n💡 NEXT STEPS:");
    console.log("1. Look for the heading pattern that identifies each work experience block");
    console.log("2. Identify the container element that wraps each block");
    console.log("3. Note the data-automation-id patterns for inputs");
    console.log("4. Identify the exact button text/automation-id for 'Add Work Experience'");
})();
