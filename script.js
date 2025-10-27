// login code 

document.getElementById('wrapper').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const errorMessageDiv = document.getElementById('errorMessage');

    const correctUsername = 'user';
    const correctPassword = 'password123';

    if (usernameInput === correctUsername && passwordInput === correctPassword) {
        errorMessageDiv.textContent = ''; // Clear any previous error
        alert('Login successful!');
    
    } else {
        errorMessageDiv.textContent = 'Incorrect username or password.';
    }
});