import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import { 
    doc, 
    getDoc, 
    updateDoc, 
    arrayUnion,
    increment,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

const container = document.getElementById("movieContainer");
const form = document.getElementById("addMovieForm");
const stars = document.querySelectorAll(".starRating");

let currentUserUid = null;

onAuthStateChanged(auth, user => {
    if (user) {
        currentUserUid = user.uid;
        console.log("Вошёл:", user.email);
    } else {
        currentUserUid = null;
        console.log("Пользователь не вошёл");
    }
});

async function loadMovie() {

    if (!movieId) {
        container.innerHTML = "<h2>Фильм не найден</h2>";
        return;
    }

    const movieRef = doc(db, "movies", movieId);
    const movieSnap = await getDoc(movieRef);

    if (!movieSnap.exists()) {
        container.innerHTML = "<h2>Фильм не существует</h2>";
        return;
    }

    const movie = movieSnap.data();

    let ratingText = "Пока нет оценок";

    if (movie.ratingCount && movie.ratingCount > 0) {
        const avg = movie.ratingSum / movie.ratingCount;
        ratingText = avg.toFixed(1) + " (" + movie.ratingCount + " голосов)";
    }

    container.innerHTML = `
        <h1>${movie.title}</h1>
        <p><b>Страна:</b> ${movie.country}</p>
        <p><b>Год:</b> ${movie.year}</p>
        <p><b>Описание:</b> ${movie.description || "-"}</p>

        <h3>Трейлер</h3>
        <iframe 
            width="560" 
            height="315" 
            src="${movie.trailerUrl}" 
            frameborder="0" 
            allowfullscreen>
        </iframe>

        <h3>Рейтинг</h3>
        <p id="ratingNumber">${ratingText}</p>
    `;
}

loadMovie();

stars.forEach((star, index) => {

    star.addEventListener("click", async () => {

        if (!currentUserUid) {
            alert("Оценку могут ставить только зарегистрированные пользователи!");
            return;
        }

        const selectedRating = index + 1;

        const movieRef = doc(db, "movies", movieId);
        const movieSnap = await getDoc(movieRef);
        const movie = movieSnap.data();

        if (movie.voters && movie.voters.includes(currentUserUid)) {
            alert("Вы уже голосовали за этот фильм!");
            return;
        }

        try {
            await updateDoc(movieRef, {
                ratingSum: increment(selectedRating),
                ratingCount: increment(1),
                voters: arrayUnion(currentUserUid)
            });

            console.log("Оценка добавлена");
            stars.forEach((s, i) => {
                s.classList.toggle("starRatingHover", i < selectedRating);
            });

            loadMovie(); 

        } catch (error) {
            console.error("Ошибка голосования:", error);
        }
    });
});

form.classList.add("hidden");

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();

    if (userData.role === "Admin") {
        form.classList.remove("hidden");
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const movieRef = doc(db, "movies", movieId);
    const movieSnap = await getDoc(movieRef);

    if (!movieSnap.exists()) {
        alert("Фильм не существует");
        return;
    }

    const movie = movieSnap.data();

    const title = document.getElementById("titleUpdate").value || movie.title;
    const country = document.getElementById("countryUpdate").value || movie.country;
    const year = document.getElementById("yearUpdate").value || movie.year;
    const img = document.getElementById("imgUpdate").value || movie.img;
    const trailer = document.getElementById("trailerUrlUpdate").value || movie.trailerUrl;

    try {

        await updateDoc(movieRef, {
            title: title,
            country: country,
            year: Number(year),
            img: img,
            trailerUrl: trailer
        });

        console.log("Фильм обновлён");

        form.reset();
        loadMovie();

    } catch (error) {
        console.error("Ошибка обновления:", error);
    }

});

const deleteMovie = document.getElementById('deleteMovie');

if (deleteMovie) {
    deleteMovie.addEventListener('click', async () => {
        try {
            await deleteDoc(doc(db, "movies", movieId));
            window.location.href = "./catalogue.html"
        } catch (error) {
            console.log('Ошибка удаления', error);
        }
    });
}