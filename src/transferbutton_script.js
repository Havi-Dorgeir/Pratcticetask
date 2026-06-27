const button = document.querySelector('#eightscenebutton');
const buttonPanel = document.querySelector('#panelscrenebutton');
const coinbutton = document.querySelector('#coinscrenebutton');
const about_1st_screenbutton = document.querySelector('#about_1st_screencrenebutton');
const flower_screenbutton = document.querySelector('#flower_screencrenebutton');

button.addEventListener('click', () => {
  
  
    window.open('/eightproject.html', '_blank');
});
buttonPanel.addEventListener('click', () => {
    // Укажите здесь нужный адрес для второй кнопки, например:
    window.open('/panelproject.html', '_blank'); 
});
coinbutton.addEventListener('click', () => {
    // Укажите здесь нужный адрес для второй кнопки, например:
    window.open('/coinscene.html', '_blank'); 
});
about_1st_screenbutton.addEventListener('click', () => {
    // Укажите здесь нужный адрес для второй кнопки, например:
    window.open('/about_1st_screen.html', '_blank'); 
});
flower_screenbutton.addEventListener('click', () => {
    // Укажите здесь нужный адрес для второй кнопки, например:
    window.open('/flower.html', '_blank'); 
});