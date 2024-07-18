import React from 'react';
import { directus } from "../services/directus";

const LoginForm = ({onLogin}) => {

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const { email, password } = e.currentTarget.elements;
        console.log(email.value, password.value);
        directus.login(email.value, password.value).catch(err => {
          console.error(err);
        });
        onLogin(directus);
      };
    //const handleLoginCloseModal = () => {
    //    setisLoginModalOpen(false);
    //    };

    return (
        <div className="modal">
            <div className="modal-content">
                <form onSubmit={handleSubmit}>
                    {/*<span className="close" onClick ={handleLoginCloseModal}>*/}
                    {/*</span>*/}
                    <input
                        name='email'
                        type='email'
                        value="puzinmv@gmail.com"
                        placeholder="admin@example.com"
                        className="login-input"
                    />
                    <input
                        name='password'
                        value="123"
                        placeholder="password"
                        type='password'
                        className="login-input"
                    />
                    <button type='submit'>Login</button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;