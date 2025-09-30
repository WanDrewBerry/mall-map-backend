const bcrypt = require('bcrypt');

const password = 'password123';

// Hash the password
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error during hashing:', err);
    } else {
        console.log('Generated Hash:', hash);

        // Compare the password with the newly generated hash
        bcrypt.compare(password, hash, (err, result) => {
            if (err) {
                console.error('Error during comparison:', err);
            } else {
                console.log('Comparison Result:', result); // Should log "true"
            }
        });
    }
});