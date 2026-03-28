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
let visibleCount = 8;

const showMoreBtn = document.getElementById("showMoreBtn");

showMoreBtn.addEventListener("click", () => {
    visibleCount += 8;
    applyShowMoreLogic();
});

function getRatingText(movie) {
    if (movie.ratingCount && movie.ratingCount > 0) {
        const avg = movie.ratingSum / movie.ratingCount;

        return avg.toFixed(1);
    }
    return "Пока нет оценок";
}

function renderMovies(snapshot) {
    let html = "";

    snapshot.docs.forEach((doc, index) => {
        const movie = doc.data();
        const title = movie.title || "Шаблон";
         const genres = movie.genres?.join(", ") || "Нет жанров";
        const img = movie.img || "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
        const ratingText = `${getRatingText(movie)} (${movie.ratingCount} голосов)`

        html += `
            <div class="movie-card card${index+1}">
                <h2>
                    <a href="./pages/movie.html?id=${doc.id}">
                        ${title}
                    </a>
                </h2>
                <p>Жанры: ${genres}</p>
                <p>Рейтинг: ${ratingText}</p>
                <img src="${img}" />
            </div>
        `;
    });

    body.innerHTML = html;
    applyShowMoreLogic();
}

function renderMoviesArray(movies) {
    let html = "";

    movies.forEach((movie, index) => {
        const title = movie.title || "Шаблон";
        const genres = movie.genres?.join(", ") || "Нет жанров";
        const img = movie.img || "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
        
        // Защита от undefined/null
        const ratingSum = Number(movie.ratingSum ?? 0);
        const ratingCount = Number(movie.ratingCount ?? 0);

        const ratingText =
            ratingCount > 0
                ? `${(ratingSum / ratingCount).toFixed(1)} (${ratingCount} голосов)`
                : "Пока нет оценок";
        html += `
            <div class="movie-card card${index+1}">
                <h2>
                    <a href="./pages/movie.html?id=${movie.id}">
                        ${title}
                    </a>
                </h2>
                <p>Жанры: ${genres}</p>
                <p>Рейтинг: ${ratingText}</p>
                <img src="${img}" />
            </div>
        `;
    });

    body.innerHTML = html;
    applyShowMoreLogic();
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

    const title = document.getElementById("title").value.trim();
    const country = document.getElementById("country").value.trim();
    const year = Number(document.getElementById("year").value);
    const img = document.getElementById("img").value.trim();
    const trailer = document.getElementById("trailerUrl").value.trim();
    const genresInput = document.getElementById("genres").value.trim();

    // Разделяем жанры по запятой и убираем лишние пробелы
    const genres = genresInput ? genresInput.split(",").map(g => g.trim()).filter(g => g.length > 0) : [];

    try {
        await addDoc(collection(db, "movies"), {
            title,
            country,
            year,
            createdAt: new Date(),
            img,
            trailerUrl: trailer,
            ratingSum: 0,
            ratingCount: 0,
            voters: [],
            genres
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
const sortGenre = document.getElementById('sortGenre');

sortDir.classList.add('hidden');
sortGenre.classList.add('hidden');

async function sortMovies() {
    const snapshot = await getDocs(collection(db, "movies"));
    const movies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (sortField.value === "rating") {
        sortGenre.classList.add('hidden');
        sortDir.classList.remove('hidden');

        movies.sort((a, b) => {
            const sumA = Number(a.ratingSum ?? 0);
            const cntA = Number(a.ratingCount ?? 0);
            const sumB = Number(b.ratingSum ?? 0);
            const cntB = Number(b.ratingCount ?? 0);

            const avgA = cntA > 0 ? sumA / cntA : 0;
            const avgB = cntB > 0 ? sumB / cntB : 0;

            return sortDir.value === "asc" ? (avgA - avgB) : (avgB - avgA);
        });

        renderMoviesArray(movies);
        return;
    } 
    else if (sortField.value === "genre") {
        sortDir.classList.add('hidden');
        sortGenre.classList.remove('hidden');

        const selectedGenre = sortGenre.value;
        if (!selectedGenre) {
            renderMoviesArray([]);
            return;
        }

        visibleCount = 8;
        const sortedMovies = movies.filter(movie =>
            movie.genres?.includes(selectedGenre)
        );

        renderMoviesArray(sortedMovies);
        return;
    }
    else {
        sortGenre.classList.add('hidden');
        sortDir.classList.remove('hidden');

        const q = query(
            collection(db, "movies"),
            orderBy(sortField.value, sortDir.value)
        );
        const snapshotOrdered = await getDocs(q);

        renderMovies(snapshotOrdered);
    }
}

sortField.addEventListener("change", sortMovies);
sortDir.addEventListener("change", sortMovies);
sortGenre.addEventListener("change", sortMovies);

const searchBar = document.getElementById('search');

async function searchMovies() {
    const snapshot = await getDocs(collection(db, "movies"));

    const movies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const searchValue = searchBar.value.toLowerCase().trim();

    const filteredMovies = movies.filter(movie =>
        movie.title?.toLowerCase().includes(searchValue)
    );

    renderMoviesArray(filteredMovies);
}

searchBar.addEventListener("input", searchMovies);

function applyShowMoreLogic() {
    const cards = document.querySelectorAll(".movie-card");
    const showMoreBtn = document.getElementById("showMoreBtn");

    cards.forEach((card, index) => {
        if (index < visibleCount) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }
    });

    const visibleCards = cards.length;
    if (visibleCards <= visibleCount) {
        showMoreBtn.classList.add("hidden");
    } else {
        showMoreBtn.classList.remove("hidden");
    }
}

let currentSlide = 0;
let bannerMovies = [];
let sliderInterval;

async function loadBanner() {
    const snapshot = await getDocs(collection(db, "movies"));

    const movies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    bannerMovies = movies
        .filter(m => (m.ratingCount ?? 0) >= 10)
        .sort((a, b) => {
            const avgA = a.ratingSum / a.ratingCount;
            const avgB = b.ratingSum / b.ratingCount;
            return avgB - avgA;
        })
        .slice(0, 5);

    renderBanner();
    startSlider();
}

function renderBanner() {
    const slider = document.getElementById("bannerSlider");

    let html = "";

    bannerMovies.forEach(movie => {
        html += `
            <div class="banner-slide">
                <img src="${movie.img}" />
                <div class="banner-info">
                    <h2>${movie.title}</h2>
                    <p>⭐ ${(movie.ratingSum / movie.ratingCount).toFixed(1)}</p>
                </div>
            </div>
        `;
    });

    slider.innerHTML = html;
}

function updateSlider() {
    const slider = document.getElementById("bannerSlider");
    slider.style.transform = `translateX(-${currentSlide * 100}%)`;
}

function nextSlide() {
    currentSlide++;
    if (currentSlide >= bannerMovies.length) {
        currentSlide = 0;
    }
    updateSlider();
}

function prevSlide() {
    currentSlide--;
    if (currentSlide < 0) {
        currentSlide = bannerMovies.length - 1;
    }
    updateSlider();
}

function startSlider() {
    sliderInterval = setInterval(nextSlide, 4000);
}

document.getElementById("nextBtn").addEventListener("click", () => {
    nextSlide();
    resetInterval();
});

document.getElementById("prevBtn").addEventListener("click", () => {
    prevSlide();
    resetInterval();
});

function resetInterval() {
    clearInterval(sliderInterval);
    startSlider();
}

loadBanner();