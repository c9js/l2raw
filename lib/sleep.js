/*▄───────────────────────▄
  █                       █
  █  Работа с задержками  █
  █                       █
  ▀───────────────────────▀*/
module.exports = function() {
// Список локальных переменных
    let resolve = null; // Ссылка на resolve
    let timer = null;   // Ссылка на таймер
    
/*┌──────────────────┐
  │ Создает задержку │
  └──────────────────┘*/
    const sleep = (ms) => new Promise(r => {
    // Сохраняем resolve для возможности прерывания
        resolve = () => {
        // Сбрасываем старый таймер
            clearTimeout(timer);
            resolve = null;
            r();
        };
        
    // Создаем задержку
        timer = setTimeout(sleep.wakeup, ms);
    });
    
/*┌────────────────────┐
  │ Прерывает задержку │
  └────────────────────┘*/
    sleep.wakeup = () => {
        if (resolve) {
            resolve();
        }
    };
    
// Возвращаем sleep
    return sleep;
};
