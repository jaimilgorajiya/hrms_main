const API_URL = 'http://127.0.0.1:7000/api/packages';

async function runTests() {
    console.log('--- STARTING PACKAGE API TESTS ---');
    let packageId = null;

    // 1. CREATE PACKAGE
    console.log('\n[1] Testing POST /api/packages (Create Package)');
    const createPayload = {
        name: 'Test Starter Package',
        description: 'A test package for verification',
        price: 999,
        duration: { value: 1, unit: 'month' },
        services: ['Test Service 1', 'Test Service 2']
    };
    
    try {
        const createResRaw = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
        });
        const createRes = await createResRaw.json();
        console.log(`Status: ${createResRaw.status}`);
        console.log(`Response:`, createRes);
        
        if (createResRaw.status === 201 && createRes.success) {
            packageId = createRes.package._id;
            console.log('✅ Create Package passed.');
        } else {
            console.error('❌ Create Package failed.');
            return;
        }

        // 2. GET ALL PACKAGES
        console.log('\n[2] Testing GET /api/packages (Get All Packages)');
        const getAllResRaw = await fetch(API_URL);
        const getAllRes = await getAllResRaw.json();
        console.log(`Status: ${getAllResRaw.status}`);
        if (getAllResRaw.status === 200 && getAllRes.success && getAllRes.packages.length > 0) {
            console.log(`Found ${getAllRes.packages.length} packages.`);
            console.log('✅ Get All Packages passed.');
        } else {
            console.error('❌ Get All Packages failed.');
        }

        // 3. GET PACKAGE BY ID
        console.log(`\n[3] Testing GET /api/packages/${packageId} (Get Package by ID)`);
        const getByIdResRaw = await fetch(`${API_URL}/${packageId}`);
        const getByIdRes = await getByIdResRaw.json();
        console.log(`Status: ${getByIdResRaw.status}`);
        if (getByIdResRaw.status === 200 && getByIdRes.success && getByIdRes.package.name === 'Test Starter Package') {
            console.log('✅ Get Package by ID passed.');
        } else {
            console.error('❌ Get Package by ID failed.');
        }

        // 4. UPDATE PACKAGE
        console.log(`\n[4] Testing PUT /api/packages/${packageId} (Update Package)`);
        const updatePayload = {
            price: 1999,
            name: 'Test Pro Package'
        };
        const updateResRaw = await fetch(`${API_URL}/${packageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });
        const updateRes = await updateResRaw.json();
        console.log(`Status: ${updateResRaw.status}`);
        if (updateResRaw.status === 200 && updateRes.success && updateRes.package.price === 1999) {
            console.log('✅ Update Package passed.');
        } else {
            console.error('❌ Update Package failed.');
        }

        // 5. DELETE PACKAGE
        console.log(`\n[5] Testing DELETE /api/packages/${packageId} (Delete/Deactivate Package)`);
        const deleteResRaw = await fetch(`${API_URL}/${packageId}`, { method: 'DELETE' });
        const deleteRes = await deleteResRaw.json();
        console.log(`Status: ${deleteResRaw.status}`);
        if (deleteResRaw.status === 200 && deleteRes.success) {
            console.log('✅ Delete Package passed.');
        } else {
            console.error('❌ Delete Package failed.');
        }

        // 6. VERIFY DELETION (Should be inactive)
        console.log(`\n[6] Testing GET /api/packages/${packageId} (Verify Deactivation)`);
        const verifyResRaw = await fetch(`${API_URL}/${packageId}`);
        const verifyRes = await verifyResRaw.json();
        if (verifyRes.package.isActive === false) {
            console.log('✅ Package was properly deactivated (isActive = false).');
        } else {
            console.error('❌ Package is still active.');
        }

        console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');

    } catch (e) {
        console.error("Test failed with exception:", e);
    }
}

runTests();
