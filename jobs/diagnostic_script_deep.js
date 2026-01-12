// DEEP DIAGNOSTIC - Examine ALL inputs on the page
(function () {
    console.log("🔬 DEEP DIAGNOSTIC SCAN...\n");

    // Find the Work Experience 1 heading
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const workExpHeading = Array.from(allHeadings).find(h =>
        h.textContent.trim() === "Work Experience 1"
    );

    if (!workExpHeading) {
        console.error("❌ Could not find 'Work Experience 1' heading!");
        return;
    }

    console.log("✅ Found 'Work Experience 1' heading:", workExpHeading.tagName);

    // Try different methods to find the container
    console.log("\n=== TESTING CONTAINER SELECTORS ===");

    const tests = [
        { name: "closest('fieldset')", elem: workExpHeading.closest('fieldset') },
        { name: "closest('div[class*=\"section\"]')", elem: workExpHeading.closest('div[class*="section"]') },
        { name: "closest('div[class*=\"experience\"]')", elem: workExpHeading.closest('div[class*="experience"]') },
        { name: "closest('div[data-automation-id]')", elem: workExpHeading.closest('div[data-automation-id]') },
        { name: "parentElement", elem: workExpHeading.parentElement },
        { name: "parentElement.parentElement", elem: workExpHeading.parentElement?.parentElement },
        { name: "parentElement.parentElement.parentElement", elem: workExpHeading.parentElement?.parentElement?.parentElement }
    ];

    tests.forEach(test => {
        if (test.elem) {
            const inputs = test.elem.querySelectorAll('input, textarea');
            console.log(`\n${test.name}:`);
            console.log(`  Tag: ${test.elem.tagName}`);
            console.log(`  Class: ${test.elem.className.substring(0, 60)}...`);
            console.log(`  data-automation-id: ${test.elem.getAttribute('data-automation-id')}`);
            console.log(`  Inputs found: ${inputs.length}`);

            if (inputs.length > 0) {
                console.log(`  ✅ This looks promising!`);
                console.log(`  Sample inputs:`);
                Array.from(inputs).slice(0, 8).forEach((inp, i) => {
                    const label = findLabelForInput(inp);
                    console.log(`    [${i + 1}] ${inp.type || inp.tagName.toLowerCase()}`);
                    console.log(`        Label: "${label}"`);
                    console.log(`        name: "${inp.name}"`);
                    console.log(`        data-automation-id: "${inp.getAttribute('data-automation-id')}"`);
                    console.log(`        placeholder: "${inp.placeholder}"`);
                    console.log(`        id: "${inp.id}"`);
                    console.log(`        aria-label: "${inp.getAttribute('aria-label')}"`);
                });
            }
        } else {
            console.log(`\n${test.name}: null`);
        }
    });

    // Helper function to find label for input
    function findLabelForInput(input) {
        // Check for label with for attribute
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent.trim();
        }

        // Check if input is inside a label
        const parentLabel = input.closest('label');
        if (parentLabel) return parentLabel.textContent.trim();

        // Look for nearby label
        let prev = input.previousElementSibling;
        while (prev && prev !== input.parentElement) {
            if (prev.tagName === 'LABEL') return prev.textContent.trim();
            const label = prev.querySelector('label');
            if (label) return label.textContent.trim();
            prev = prev.previousElementSibling;
        }

        // Check parent's previous sibling
        const parentPrev = input.parentElement?.previousElementSibling;
        if (parentPrev?.tagName === 'LABEL') return parentPrev.textContent.trim();
        const labelInParentPrev = parentPrev?.querySelector('label');
        if (labelInParentPrev) return labelInParentPrev.textContent.trim();

        return "(no label found)";
    }

    console.log("\n\n=== ALL INPUTS ON PAGE ===");
    const allInputs = document.querySelectorAll('input, textarea');
    console.log(`Total inputs/textareas: ${allInputs.length}\n`);

    Array.from(allInputs).forEach((inp, i) => {
        const label = findLabelForInput(inp);
        console.log(`[Input ${i + 1}] ${inp.type || inp.tagName.toLowerCase()}`);
        console.log(`  Label: "${label}"`);
        console.log(`  name: "${inp.name}"`);
        console.log(`  data-automation-id: "${inp.getAttribute('data-automation-id')}"`);
        console.log(`  placeholder: "${inp.placeholder || ''}"`);
        console.log(``);
    });

    console.log("\n✅ DEEP DIAGNOSTIC COMPLETE!");
})();
