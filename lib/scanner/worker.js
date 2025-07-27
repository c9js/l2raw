/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const { parentPort, workerData } = require('worker_threads');
const utils = require('../utils');
const L2 = require('../../build/Release/l2raw');

/*▄─────────────────────────────────────────────────────────────────▄
  █                                                                 █
  █  Регистрируем глобальные обработчики ошибок на уровне процесса  █
  █                                                                 █
  ▀─────────────────────────────────────────────────────────────────▀*/
utils.registerExceptionHandlers(parentPort.postMessage.bind(parentPort));

/*▄──────────────────────▄
  █                      █
  █  Запускаем приемник  █
  █                      █
  ▀──────────────────────▀*/
(async ({iface, delay}) => {
// Запускаем бесконечное получение пакетов
    while (true) {
    // Запускаем получение пакета (блокирующий вызов)
        let packet = L2.scanner(iface);
        
    // Удаляем MAC-адрес (первые 6 байт пакета)
        packet = packet.slice(6);
        
    // Сообщаем о получении пакета (передаем напрямую без копирования)
        parentPort.postMessage(packet, [packet.buffer]);
        
    // Создаем задержку
        await utils.sleep(delay);
    }
})(workerData);
