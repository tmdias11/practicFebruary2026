function changeTheme() {
    document.body.classList.toggle("light");

    const btn = document.getElementById("changeTheme");
    const lightIcon = "/img/light-icon.svg";
    const darkIcon = "/img/dark-icon.svg";

    if (document.body.classList.contains("light")) {
        btn.style.backgroundImage = `url("${darkIcon}")`;
    } else {
        btn.style.backgroundImage = `url("${lightIcon}")`;
    }
}