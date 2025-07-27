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
        let packetBuffer = L2.scanner(iface);
        
    // Сообщаем о получении пакета (передаем без копирования, используем ту же область памяти)
        parentPort.postMessage(packetBuffer, [packetBuffer.buffer]);
        
    // Создаем задержку
        await utils.sleep(delay);
    }
})(workerData);
