
const normalize = (text) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const names = ["Tolúwanimí", "Ọbafẹmi", "Àánúolúwapọ̀"];
names.forEach(n => {
    console.log(`${n} -> ${normalize(n)}`);
});
