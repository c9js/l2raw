#include <node_api.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netpacket/packet.h>
#include <net/if.h>
#include <sys/ioctl.h>
#include <netinet/if_ether.h>
#include <arpa/inet.h>

#define MIN_PACKET_SIZE 14
#define MAX_PACKET_SIZE 1514

// Получение имени интерфейса из аргумента
bool get_iface_name(napi_env env, napi_value arg, char* iface, size_t size) {
    size_t iface_len;
    napi_status status = napi_get_value_string_utf8(env, arg, iface, size, &iface_len);
    if (status != napi_ok || iface_len == 0 || iface_len >= size) {
        napi_throw_type_error(env, NULL, "Invalid interface name");
        return false;
    }
    return true;
}

// Создание RAW сокета
int create_raw_socket(napi_env env) {
    int sock = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ALL));
    if (sock < 0) {
        napi_throw_error(env, NULL, "Failed to create socket");
    }
    return sock;
}

// Получение индекса интерфейса
int get_iface_index(napi_env env, int sock, const char* iface) {
    struct ifreq ifr = {0};
    snprintf(ifr.ifr_name, IFNAMSIZ, "%s", iface);
    if (ioctl(sock, SIOCGIFINDEX, &ifr) < 0) {
        close(sock);
        napi_throw_error(env, NULL, "Interface not found");
        return -1;
    }
    return ifr.ifr_ifindex;
}

// Функция для приёма L2 пакета
napi_value Scanner(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_status status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    
    // Проверка количества аргументов
    if (status != napi_ok || argc < 1) {
        napi_throw_type_error(env, NULL, "Not enough arguments");
        return NULL;
    }
    
    // Аргумент 0: имя интерфейса (строка)
    char iface[IFNAMSIZ];
    if (!get_iface_name(env, args[0], iface, sizeof(iface))) {
        return NULL;
    }
    
    // Создание RAW сокета
    int sock = create_raw_socket(env);
    if (sock < 0) {
        return NULL;
    }
    
    // Получение индекса интерфейса
    int ifindex = get_iface_index(env, sock, iface);
    if (ifindex < 0) {
        return NULL;
    }
    
    // Привязка к интерфейсу
    struct sockaddr_ll addr = {0};
    addr.sll_family = AF_PACKET;
    addr.sll_ifindex = ifindex;
    
    if (bind(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(sock);
        napi_throw_error(env, NULL, "Failed to bind socket");
        return NULL;
    }
    
    // Приём пакета
    unsigned char buffer[MAX_PACKET_SIZE];
    ssize_t len = recvfrom(sock, buffer, sizeof(buffer), 0, NULL, NULL);
    close(sock);
    
    if (len < 0) {
        napi_throw_error(env, NULL, "Failed to receive packet");
        return NULL;
    }
    
    // Возврат как Buffer
    napi_value result;
    status = napi_create_buffer_copy(env, len, buffer, NULL, &result);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to create return value");
        return NULL;
    }
    return result;
}

// Функция для отправки L2 пакета
napi_value Sender(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_status status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    
    // Проверка количества аргументов
    if (status != napi_ok || argc < 2) {
        napi_throw_type_error(env, NULL, "Not enough arguments");
        return NULL;
    }
    
    // Аргумент 0: имя интерфейса (строка)
    char iface[IFNAMSIZ];
    if (!get_iface_name(env, args[0], iface, sizeof(iface))) {
        return NULL;
    }
    
    // Аргумент 1: буфер с данными
    void* buffer;
    size_t len;
    status = napi_get_buffer_info(env, args[1], &buffer, &len);
    if (status != napi_ok) {
        napi_throw_type_error(env, NULL, "Second argument must be a Buffer");
        return NULL;
    }
    if (len < MIN_PACKET_SIZE) {
        napi_throw_range_error(env, NULL, "Invalid buffer size: min 14 bytes");
        return NULL;
    }
    if (len > MAX_PACKET_SIZE) {
        napi_throw_range_error(env, NULL, "Invalid buffer size: max 1514 bytes");
        return NULL;
    }
    
    // Создание RAW сокета
    int sock = create_raw_socket(env);
    if (sock < 0) {
        return NULL;
    }
    
    // Получение индекса интерфейса
    int ifindex = get_iface_index(env, sock, iface);
    if (ifindex < 0) {
        return NULL;
    }
    
    struct sockaddr_ll addr = {0};
    addr.sll_family = AF_PACKET;
    addr.sll_ifindex = ifindex;
    
    // Отправка пакета
    ssize_t sent = sendto(sock, buffer, len, 0, (struct sockaddr*)&addr, sizeof(addr));
    close(sock);
    
    if (sent < 0) {
        napi_throw_error(env, NULL, "Failed to send packet");
        return NULL;
    }
    
    napi_value result;
    status = napi_create_int32(env, sent, &result);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to create return value");
        return NULL;
    }
    return result;
}

// Экспорт функций
napi_value Init(napi_env env, napi_value exports) {
    napi_value fnScanner, fnSender;
    napi_status status = napi_create_function(env, NULL, 0, Scanner, NULL, &fnScanner);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to create 'scanner' function");
        return NULL;
    }
    status = napi_create_function(env, NULL, 0, Sender, NULL, &fnSender);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to create 'sender' function");
        return NULL;
    }
    status = napi_set_named_property(env, exports, "scanner", fnScanner);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to set 'scanner' property");
        return NULL;
    }
    status = napi_set_named_property(env, exports, "sender", fnSender);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to set 'sender' property");
        return NULL;
    }
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
