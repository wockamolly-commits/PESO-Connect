Update EmployerRegistration.jsx - Step: Business Address

Currently, the Province, City / Municipality, and Barangay fields are plain text inputs. Please convert them into cascading geographic dropdowns (<select> elements) populated by our PSGC dataset.

Please implement the following:
1. Reuse Existing Patterns: Look at src/components/registration/Step3ContactEmployment.jsx or src/pages/JobseekerProfileEdit.jsx as a reference for how we import and process the PSGC data logic.
2. Cascading Dropdowns:
   - Province Dropdown: Populates with the unique list of provinces.
   - City/Municipality Dropdown: Disabled until a province is chosen. Options are filtered based on the selected province.
   - Barangay Dropdown: Disabled until a city is chosen. Options are filtered based on the selected city/municipality.
3. State Management: Overwrite the formData update logic so that when the user changes their selected Province, it automatically resets the City and Barangay values to empty. When the City changes, reset the Barangay value.
4. Styling Consistency: Ensure the <select> tags match the same Tailwind CSS classes as the rest of the form (e.g., using input-field pl-12 bg-white appearance-none). Keep the Lucide icons visually in place to ensure the UI looks identical to the original text input counterparts.
5. Leave the Street / Village / Bldg Number field untouched as a standard text input.
