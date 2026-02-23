import { auth } from "../js/firebase.js";
import { db } from "../js/firebase.js"
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const userName_input = document.getElementById('username').value;
    const email_input = document.getElementById('email').value;
    const password_input = document.getElementById('password').value;
    const repPass_input = document.getElementById('repPass').value;

    if (password_input !== repPass_input) {
        alert("Пароли не совпадают!");
        return;
    }

    createUserWithEmailAndPassword(auth, email_input, password_input)
        .then((userCredential) => {
            console.log("Пользователь создан:", userCredential.user);
        })
        .catch((error) => {
            console.error("Ошибка регистрации:", error.message);
        });
    });
}
const signinForm = document.getElementById('signinForm');

if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        signInWithEmailAndPassword(auth, email, password);
    });
}

const logout = document.getElementById('logout');
logout.addEventListener('click', (e) =>{
    e.preventDefault();
    signOut(auth);
})

const profile = document.getElementById('profile');
const signup = document.getElementById('signup');
const signin = document.getElementById('signin');
onAuthStateChanged(auth, (user) =>{
    if(user){
        console.log("Вход выполнен", user);
        logout.classList.remove('hidden');
        profile.classList.remove('hidden');
        signup.classList.add('hidden');
        signin.classList.add('hidden');
        profileInfo(user);
    }
    else{
        console.log("Вход не выполнен")
        profile.classList.add('hidden');
        signup.classList.remove('hidden');
        signin.classList.remove('hidden');
        logout.classList.add('hidden');
        profileInfo();
    }
})

const movies = collection(db, 'movies');

getDocs(movies)
    .then(snapshot => {
        snapshot.docs.forEach(doc => {
            console.log(doc.id, doc.data());
        });
    })
    .catch(error => {
        console.error("Ошибка при получении коллекции:", error);
    });

const userInfo = document.getElementById('userInfo');
const profileHeader = document.getElementById('profileHeader');
const profileInfo = (user) => 
    {if(profileHeader){
        if (user){
            profileHeader.innerText = "Ваш профиль"
            const html = `
                <div> Ваша почта: ${user.email}</div>
            `
            userInfo.innerHTML = html;
        }
        else{
            profileHeader.innerText = 'Вы не вошли в аккаунт\nСейчас вас перенесёт на страницу входа';
            userInfo.innerHTML ='';
            setTimeout(()=>{
                window.location.href = "./signin.html";
            }, 7000);
        };
    }
};