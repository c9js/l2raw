/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const { parentPort, workerData } = require('worker_threads');
const utils = require('../utils');
const Sleep = require('../sleep');
const L2 = require('../../build/Release/l2raw');

/*▄─────────────────────────────────────────────────────────────────▄
  █                                                                 █
  █  Регистрируем глобальные обработчики ошибок на уровне процесса  █
  █                                                                 █
  ▀─────────────────────────────────────────────────────────────────▀*/
utils.registerExceptionHandlers(parentPort.postMessage.bind(parentPort));

/*▄────────────────────────▄
  █                        █
  █  Запускаем передатчик  █
  █                        █
  ▀────────────────────────▀*/
(async ({iface, delay, packetBuffer}) => {
// Создаем экземпляр для работы с задержками
    const sleep = new Sleep();
    
// Добавляем обработчик обновления пакета
    parentPort.on('message', ([newPacketBuffer, macBuffer]) => {
    // Обновляем пакет для следующей отправки
        packetBuffer = newPacketBuffer;
        
    // Добавляем MAC-адрес (первые 6 байт пакета)
        packetBuffer = Buffer.concat([macBuffer, packetBuffer]);
        
    // Прерываем задержку и первый пакет отправляем сразу
        sleep.wakeup();
    });
    
// Запускаем бесконечную отправку пакетов
    while (true) {
    // Количество отправленных байт
        let bytesSent = -1;
        
    // Проверяем пакет для следующей отправки
        if (packetBuffer) {
        // Запускаем отправку пакета (блокирующий вызов)
            bytesSent = L2.sender(iface, packetBuffer);
        }
        
    // Сообщаем об отправке пакета (передаем количество отправленных байт)
        parentPort.postMessage(bytesSent);
        
    // Создаем задержку
        await sleep(delay);
    }
})(workerData);
