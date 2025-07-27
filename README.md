# l2raw

📡 Работа с RAW-пакетами на уровне канального уровня (L2) в Node.js через нативный C-аддон.

> Дает возможность напрямую принимать и отправлять Ethernet-пакеты через выбранный сетевой интерфейс. Отлично подходит для создания низкоуровневых сетевых инструментов, протоколов или симуляции сетевого трафика.

---

## ⚙️ Установка

```bash
npm install c9js/l2raw
```

---

## 📥 Получение пакетов

Пример: [`test/scan.js`](test/scan.js)

```js
const { Scanner } = require('l2raw');

const scanner = new Scanner({ iface: 'eth0' });

scanner.on('data', (packetBuffer) => {
    console.log('Пакет получен: ', packetBuffer.toString('hex'));
});
```

---

## 📥 Получение только broadcast-пакетов

Пример: [`test/scan.js`](test/scan.js)

```js
const { Scanner } = require('l2raw');

const scanner = new Scanner({ iface: 'eth0' });

scanner.on('data', (packetBuffer, packet, isBroadcast) => {
// Фильтруем только broadcast-пакеты (MAC-адрес назначения FF:FF:FF:FF:FF:FF)
    if (!isBroadcast(packet)) return;
    
// Выводим в консоль
    console.log(`Пакет получен: ${packetBuffer.toString('hex')}`);
});
```

---

## 📥 Получение пакетов с фильтрацией по MAC-адресу

Пример: [`test/scan-mac-filter.js`](test/scan-mac-filter.js)

```js
const { Scanner } = require('l2raw');

const scanner = new Scanner({ iface: 'eth0' });

scanner.on('data', (packetBuffer, packet, macFilter) => {
// Создаем MAC-адрес для фильтрации пакетов (22:33:44:55:66:77)
    const macBuffer = Buffer.from('223344556677', 'hex');
    
// Фильтруем пакеты по MAC-адресу (получаем пакеты только от заданного MAC-адреса)
    if (!macFilter(packet, macBuffer)) return;
    
// Выводим в консоль
    console.log(`Пакет получен: ${packetBuffer.toString('hex')}`);
    console.log(`MAC-адрес (фильтр): ${macBuffer.toString('hex')}`);
});
```

---

## 📤 Отправка пакетов

Пример: [`test/send.js`](test/send.js)

```js
const { Sender } = require('l2raw');

const sender = new Sender({ iface: 'eth0' });

// Обновляем пакет для следующей отправки
sender.update(Buffer.from('1122334455667788', 'hex'));

// Добавляем обработчик отправки пакетов
sender.on('data', (packetBuffer) => {
    console.log('Пакет отправлен: ', packetBuffer.toString('hex'));
});
```

---

## 📤 Отправка пакетов на указанный MAC-адрес

Пример: [`test/send.js`](test/send.js)

```js
const { Sender } = require('l2raw');

const sender = new Sender({ iface: 'eth0' });

// Обновляем MAC-адрес получателя
sender.updateMac(Buffer.from('223344556677', 'hex'));

// Обновляем пакет для следующей отправки
sender.update(Buffer.from('0000000000004321', 'hex'));

// Добавляем обработчик отправки пакетов на указанный MAC-адрес
sender.on('data', (packetBuffer, macBuffer) => {
    console.log('Пакет отправлен: ', packetBuffer.toString('hex'));
    console.log('MAC-адрес получателя: ', macBuffer.toString('hex'));
});
```

---

## 🔧 API

### `new Scanner(options)`

- `iface` — Имя сетевого интерфейса (например, `'eth0'`)
- `delay` — Задержка между пакетами (мс)
- `delayError` — Задержка после ошибки
- `timeout` — Время на получение пакета

События:

- `data` — Пакет получен
- `error` — Во время работы произошла ошибка
- `start` — Приемник запущен
- `stop` — Приемник остановлен
- `exit` — Во время работы произошло аварийное завершение воркера
- `restart`— Приемник перезапущен
- `timeout` — Закончилось отведенное время на получение пакета

---

### `new Sender(options)`

- `iface` — Имя сетевого интерфейса (например, `'eth0'`)
- `delay` — Задержка между пакетами (мс)
- `delayError` — Задержка после ошибки
- `timeout` — Время на отправку пакета

Методы:

- `update(buffer)` — Обновить пакет для следующей отправки
- `updateMac(buffer)` — Обновить MAC-адрес получателя

События:

- `data` — Пакет отправлен
- `update` — Пакет обновлен
- `updateMac` — MAC-адрес обновлен
- `error` — Во время работы произошла ошибка
- `start` — Передатчик запущен
- `stop` — Передатчик остановлен
- `exit` — Во время работы произошло аварийное завершение воркера
- `restart`— Передатчик перезапущен
- `timeout` — Закончилось отведенное время на отправку пакета

---

## 📁 Структура проекта

```
l2raw/
├── index.js                 # Экспортирует Scanner и Sender
├── lib/
│   ├── scanner/             # Приемник пакетов
│   │   ├── scanner.js
│   │   └── worker.js
│   ├── sender/              # Передатчик пакетов
│   │   ├── sender.js
│   │   └── worker.js
│   ├── utils.js             # Вспомогательные функции
│   └── addon/               # Исходник C-аддона
│       └── l2raw.c
├── build/Release/l2raw.node # Собранный бинарный модуль (после сборки)
└── test/
    ├── scan.js              # Пример получения пакетов
    ├── scan-mac-filter.js   # Пример получения пакетов с фильтрацией по MAC-адресу
    └── send.js              # Пример отправки пакетов
```

---

## 📄 Лицензия

MIT License
