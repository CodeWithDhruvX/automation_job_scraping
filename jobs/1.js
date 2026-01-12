(function () {

    const profile = {
        firstName: "Dhruv",
        middleName: "M",
        lastName: "Shah",
        preferredName: "",
        country: "India",

        address1: "Silver Spring Rajyash City, Nr TRP Mall, HDFC Bank Lane, Bopal-Ghuama, BRTS, Main Road",
        address2: "Central Bopal",
        city: "Ahmedabad",
        postalCode: "380058",
        state: "Gujarat",

        email: "dhruvshahlinkedin@gmail.com",

        phoneType: "Mobile",
        countryCode: "+91",
        phone: "8469427697",
        extension: ""
    };

    function setInput(selector, value) {
        const el = document.querySelector(selector);
        if (!el) return console.warn("Missing:", selector);
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setSelect(selector, labelText) {
        const select = document.querySelector(selector);
        if (!select) return console.warn("Missing:", selector);
        [...select.options].forEach(o => {
            if (o.text.trim() === labelText) select.value = o.value;
        });
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // --- Fill Form ---
    setInput('input[name="firstName"]', profile.firstName);
    setInput('input[name="middleName"]', profile.middleName);
    setInput('input[name="lastName"]', profile.lastName);
    setInput('input[name="preferredName"]', profile.preferredName);
    setSelect('select[name="country"]', profile.country);

    setInput('input[name="addressLine1"]', profile.address1);
    setInput('input[name="addressLine2"]', profile.address2);
    setInput('input[name="city"]', profile.city);
    setInput('input[name="postalCode"]', profile.postalCode);
    setSelect('select[name="state"]', profile.state);

    setInput('input[name="email"]', profile.email);

    setSelect('select[name="phoneType"]', profile.phoneType);
    setInput('input[name="countryCode"]', profile.countryCode);
    setInput('input[name="phoneNumber"]', profile.phone);
    setInput('input[name="extension"]', profile.extension);

    console.log("Form filled successfully ✔");

})();
