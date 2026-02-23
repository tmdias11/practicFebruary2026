import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import { 
    collection, 
    addDoc, 
    getDocs,
    getDoc,
    doc,
    query,
    orderBy,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const form = document.getElementById("addMovieForm");
const body = document.getElementById("movBody");

function getRatingText(movie) {
    if (movie.ratingCount && movie.ratingCount > 0) {
        const avg = movie.ratingSum / movie.ratingCount;

        return avg.toFixed(1);
    }
    return "Пока нет оценок";
}

function renderMovies(snapshot) {
    let html = "";

    snapshot.docs.forEach(doc => {
        const movie = doc.data();
        const title = movie.title || "Шаблон";
        const country = movie.country || "Шаблон";
        const img = movie.img || "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
        const ratingText = `${getRatingText(movie)} (${movie.ratingCount} голосов)`

        html += `
            <div class="movie-card">
                <h2>
                    <a href="movie.html?id=${doc.id}">
                        ${title}
                    </a>
                </h2>
                <p>Страна: ${country}</p>
                <p>Рейтинг: ${ratingText}</p>
                <img src="${img}" />
            </div>
        `;
    });

    body.innerHTML = html;
}

async function loadMovies() {
    const moviesRef = collection(db, "movies");
    const snapshot = await getDocs(moviesRef);
    renderMovies(snapshot);
}

loadMovies();

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

    const title = document.getElementById("title").value;
    const country = document.getElementById("country").value;
    const year = document.getElementById("year").value;
    const img = document.getElementById("img").value;
    const trailer = document.getElementById("trailerUrl").value;

    try {
        await addDoc(collection(db, "movies"), {
            title: title,
            country: country,
            year: Number(year),
            createdAt: new Date(),
            img: img,
            trailerUrl: trailer,
            ratingSum: 0, 
            ratingCount: 0,
            voters: [],
            avgRating: ratingSum/ratingCount,
        });

        console.log("Фильм добавлен");

        form.reset();
        loadMovies();

    } catch (error) {
        console.error("Ошибка добавления:", error);
    }
});

const sortField = document.getElementById('sort');
const sortDir = document.getElementById('sortDir');

async function sortMovies() {
    let q 
    if (sortField.value === "rating") {
        const snapshot = await getDocs(collection(db, "movies"));
        const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        movies.sort((a, b) => {
            const avgA = a.ratingCount ? a.ratingSum / a.ratingCount : 0;
            const avgB = b.ratingCount ? b.ratingSum / b.ratingCount : 0;
            return sortDir.value === "asc" ? avgA - avgB : avgB - avgA;
        });
        renderMoviesArray(movies);
        return;
    } 
    else{
        q = query(
            collection(db, "movies"),
            orderBy(sortField.value, sortDir.value)
        );
    }

    const snapshot = await getDocs(q);

    renderMovies(snapshot); 
}

sortField.addEventListener("change", sortMovies);
sortDir.addEventListener("change", sortMovies);


