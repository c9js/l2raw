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

/*▄────────────────────────────────▄
  █                                █
  █  MAC-адрес: FF:FF:FF:FF:FF:FF  █
  █  (первые 6 байт пакета)        █
  █                                █
  ▀────────────────────────────────▀*/
const MAC_ADDRESS = Buffer.alloc(6, 0xFF);

/*▄────────────────────────▄
  █                        █
  █  Запускаем передатчик  █
  █                        █
  ▀────────────────────────▀*/
(async ({iface, delay, packet}) => {
// Добавляем обработчик обновления пакета
    parentPort.on('message', (newPacket) => {
    // Обновляем пакет для следующей отправки
        packet = newPacket;
        
    // Добавляем MAC-адрес (первые 6 байт пакета)
        packet = Buffer.concat([MAC_ADDRESS, packet]);
    });
    
// Запускаем бесконечную отправку пакетов
    while (true) {
    // Количество отправленных байт
        let bytesSent = -1;
        
    // Проверяем пакет для следующей отправки
        if (packet) {
        // Запускаем отправку пакета (блокирующий вызов)
            bytesSent = L2.sender(iface, packet);
        }
        
    // Сообщаем об отправке пакета (передаем количество отправленных байт)
        parentPort.postMessage(bytesSent);
        
    // Создаем задержку
        await utils.sleep(delay);
    }
})(workerData);
