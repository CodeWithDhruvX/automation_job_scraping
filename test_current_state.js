// Quick test - Run this to see current state
(function () {
    console.log("=== CURRENT PAGE STATE ===\n");

    // Find ALL headings
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    console.log(`Total headings on page: ${allHeadings.length}`);

    // Find work experience headings
    const workExpHeadings = Array.from(allHeadings).filter(h =>
        /work.*experience/i.test(h.textContent)
    );

    console.log(`\nWork Experience related headings: ${workExpHeadings.length}`);
    workExpHeadings.forEach(h => {
        console.log(`  - "${h.textContent.trim()}" (${h.tagName})`);
    });

    // Test the exact pattern used in script
    const blocks = [];
    const headings = [...document.querySelectorAll("h3, h4, h5")];

    for (const heading of headings) {
        const headingText = heading.textContent.trim();
        if (/Work Experience \d+/.test(headingText)) {
            const container = heading.parentElement?.parentElement;
            const inputs = container ? container.querySelectorAll("input, textarea") : [];

            console.log(`\n✅ FOUND: "${headingText}"`);
            console.log(`   Container: ${container ? container.tagName : 'null'}`);
            console.log(`   Inputs in container: ${inputs.length}`);

            blocks.push({ heading, container, text: headingText });
        }
    }

    console.log(`\n\nTotal blocks found by script logic: ${blocks.length}`);

    if (blocks.length === 0) {
        console.log("\n❌ NO BLOCKS FOUND!");
        console.log("Possible reasons:");
        console.log("1. Not on Work Experience section");
        console.log("2. Need to scroll down to the Work Experience section");
        console.log("3. Page structure changed");

        console.log("\n\nAll headings on page:");
        Array.from(allHeadings).forEach((h, i) => {
            console.log(`  [${i + 1}] ${h.tagName}: "${h.textContent.trim()}"`);
        });
    }
})();
