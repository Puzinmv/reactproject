import React, { useState } from 'react';


const LoginForm = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');


    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password);
      };


    return (
        <div className="modal">
            <div className="modal-content">
                <form onSubmit={handleSubmit}>
                    {/*<span className="close" onClick ={handleLoginCloseModal}>*/}
                    {/*</span>*/}
                    <input
                        name='email'
                        type='email'
                        value={email}
                        placeholder="admin@example.com"
                        className="login-input"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        name='password'
                        value={password}
                        placeholder="password"
                        type='password'
                        className="login-input"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type='submit'>Login</button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;