## 第7篇：MFA实战：TOTP与HOTP算法是如何工作的？

在上一篇中，我们概览了多因素认证（MFA）的重要性及常见类型。其中，一次性密码（OTP）因其便捷性和较高的安全性而成为MFA的基石。而OTP家族中，**基于时间的一次性密码（TOTP）** 和**基于HMAC的一次性密码（HOTP）** 是应用最广泛的两种算法。

你可能已经在Google Authenticator、Microsoft Authenticator等应用中体验过TOTP，或者在一些物理令牌上见过HOTP。那么，这些看似随机却又能被服务器正确验证的6位或8位数字是如何生成的呢？本篇文章将深入揭示TOTP和HOTP的算法原理，并结合Java代码片段进行说明。

### 1. HOTP（HMAC-based One-Time Password）：基于HMAC的计数器同步

HOTP是OTP的基础，它通过一个秘密密钥和一个递增的计数器来生成一次性密码。

#### 1.1 HOTP算法原理

HOTP的核心思想是：客户端和服务器共享一个**秘密密钥（Shared Secret Key）K**和一个**计数器（Counter）C**。每次生成OTP时，计数器C递增1，然后将K和C作为输入，通过一个加密哈希函数（通常是HMAC-SHA1）来生成一个哈希值，最后从这个哈希值中提取出固定位数的数字作为OTP。

**算法步骤：**

1.  **共享秘密密钥 (K)：** 客户端（如Authenticator应用）和服务器预先协商并存储一个只有双方知道的秘密密钥。这个密钥通常以Base32编码形式展示给用户，用于在Authenticator应用中进行扫描或手动输入。
2.  **计数器 (C)：** 客户端和服务器都维护一个独立的计数器，初始值通常为0或1。每次生成或验证OTP时，计数器都会递增。
3.  **计算HMAC值：** 使用HMAC-SHA1算法，以共享秘密密钥K作为HMAC的密钥，以计数器C的字节表示作为HMAC的消息。
    * `HS = HMAC-SHA1(K, C)`
    * 这里需要注意，计数器C是一个64位的整数，需要将其转换为字节数组。
4.  **动态截取（Dynamic Truncation）：** 从HMAC-SHA1生成的20字节（160位）哈希值`HS`中，提取出一个31位（非符号位）的数字。这个过程是为了从二进制哈希值中获得一个可读的数字OTP。
    * 取`HS`的最后一个字节的低4位（`HS[19] & 0xF`）作为偏移量`offset`。
    * 从`HS`中`offset`位置开始，连续取4个字节（`HS[offset...offset+3]`）。
    * 将这4个字节转换为一个32位整数，并将其最高位清零（避免负数）。
    * `Snum = (HS[offset] & 0x7f) << 24 | (HS[offset+1] & 0xff) << 16 | (HS[offset+2] & 0xff) << 8 | (HS[offset+3] & 0xff)`
5.  **生成OTP：** 将上一步得到的31位数字`Snum`对`10^D`取模，其中`D`是OTP的位数（通常是6位或8位），然后补足前导零。
    * `OTP = Snum % (10^D)`

#### 1.2 HOTP的挑战：计数器同步

HOTP的主要挑战在于客户端和服务器的计数器必须严格同步。如果用户在客户端多次生成OTP但没有在服务器端验证（例如，生成了两次但只提交了一次），或者服务器因为某些原因重置了计数器，都可能导致计数器不同步，从而无法通过验证。

为了解决这个问题，服务器通常会维护一个“窗口”（Look-ahead Window）。当用户提交一个OTP时，服务器不仅检查当前计数器C的OTP，还会检查C+1、C+2...C+W（W为窗口大小）的OTP。一旦在窗口内找到匹配的OTP，服务器就会将自己的计数器更新到匹配的那个值，以实现“漂移”同步。

#### 1.3 HOTP Java代码片段示例

下面是一个简化的HOTP实现示例。在实际应用中，通常会使用现有的库。

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

public class HotpUtil {

    private static final String ALGORITHM = "HmacSHA1"; // RFC 4226 推荐使用HMAC-SHA1

    /**
     * 生成HOTP
     * @param secretKey 共享秘密密钥
     * @param counter 计数器值
     * @param digits OTP位数 (通常是6或8)
     * @return 生成的OTP字符串
     */
    public static String generateHOTP(byte[] secretKey, long counter, int digits)
            throws NoSuchAlgorithmException, InvalidKeyException {

        // 1. 将计数器转换为8字节的字节数组
        ByteBuffer buffer = ByteBuffer.allocate(8);
        buffer.putLong(counter);
        byte[] counterBytes = buffer.array();

        // 2. 计算HMAC-SHA1值
        Mac hmac = Mac.getInstance(ALGORITHM);
        SecretKeySpec keySpec = new SecretKeySpec(secretKey, ALGORITHM);
        hmac.init(keySpec);
        byte[] hash = hmac.doFinal(counterBytes);

        // 3. 动态截取 (Dynamic Truncation)
        // 取最后一个字节的低4位作为偏移量
        int offset = hash[hash.length - 1] & 0xF;
        // 从偏移量处取4个字节
        int binary = ((hash[offset] & 0x7f) << 24) |
                     ((hash[offset + 1] & 0xff) << 16) |
                     ((hash[offset + 2] & 0xff) << 8) |
                     (hash[offset + 3] & 0xff);

        // 4. 生成OTP (对10^digits取模)
        int otp = binary % (int) Math.pow(10, digits);

        // 格式化为指定位数，不足前面补零
        return String.format("%0" + digits + "d", otp);
    }

    public static void main(String[] args) throws Exception {
        // 示例：密钥和计数器
        byte[] secret = "12345678901234567890".getBytes(); // 示例密钥，实际应是随机且安全的
        long counter = 0; // 初始计数器

        for (int i = 0; i < 5; i++) {
            String otp = generateHOTP(secret, counter + i, 6);
            System.out.println("Counter: " + (counter + i) + ", OTP: " + otp);
        }
        
        // 验证示例：服务器端接收到用户提交的OTP 
        // 假设用户提交了第一个OTP "755224"
        String userSubmittedOtp = "755224";
        long serverCounter = 0; // 服务器当前计数器
        int lookAheadWindow = 5; // 窗口大小

        boolean verified = false;
        long verifiedCounter = -1;

        for (int i = 0; i <= lookAheadWindow; i++) {
            String expectedOtp = generateHOTP(secret, serverCounter + i, 6);
            if (expectedOtp.equals(userSubmittedOtp)) {
                verified = true;
                verifiedCounter = serverCounter + i;
                break;
            }
        }

        if (verified) {
            System.out.println("OTP Verified successfully. Counter updated to: " + (verifiedCounter + 1));
            // 成功验证后，服务器需要更新其计数器到 verifiedCounter + 1
            serverCounter = verifiedCounter + 1; 
        } else {
            System.out.println("OTP Verification failed.");
        }
    }
}
```

### 2. TOTP（Time-based One-Time Password）：基于时间的动态密码

TOTP是HOTP的变体，它用基于时间的值（通常是当前时间戳的离散化）代替了递增的计数器，从而消除了计数器同步的复杂性。

#### 2.1 TOTP算法原理

TOTP的核心思想是：客户端和服务器共享一个**秘密密钥K**，并且都依赖于**当前时间**。时间被划分为固定长度的“时间步长”（Time Step，通常为30秒或60秒）。在这个时间步长内，OTP是固定的。

**算法步骤：**

1.  **共享秘密密钥 (K)：** 同HOTP，客户端和服务器共享一个秘密密钥。
2.  **时间步长 (X)：** 定义一个时间窗口的长度，例如30秒。
3.  **当前时间戳 (T)：** 获取当前的Unix时间戳（自UTC 1970年1月1日0时0分0秒以来的秒数）。
4.  **计算时间计数器 (TC)：** 将当前时间戳除以时间步长X，得到一个整数值，作为时间计数器。
    * `TC = floor(Current_Unix_Time / X)`
    * 这个`TC`值在整个时间步长X内是固定的。
5.  **HMAC计算和截取：** 接下来，步骤与HOTP完全相同，只是将`TC`作为HOTP算法中的计数器`C`：
    * `OTP = HOTP(K, TC)`
    * 即：`HS = HMAC-SHA1(K, TC)`，然后进行动态截取和取模运算。

#### 2.2 TOTP的优势与考虑

**优势：**
* **无需计数器同步：** 这是TOTP最大的优势。只要客户端和服务器的时间大致同步（通常允许几分钟的偏差），就能生成相同的OTP。这大大简化了实现和用户体验。
* **更广泛的应用：** 适合移动Authenticator应用，用户无需每次操作后都通知服务器。

**考虑因素：**
* **时间同步：** 客户端设备和服务器的时间必须相对准确。如果偏差过大（超过一个或两个时间步长），OTP将无法匹配。通常允许+-1个时间步长的偏差进行验证，即服务器会尝试`TC-1`, `TC`, `TC+1`三个值。
* **重放攻击：** 虽然OTP是基于时间的，但如果攻击者在OTP有效期内（例如30秒内）截获并重放，仍可能成功。因此，服务器端应确保每个OTP在成功使用一次后即失效。

#### 2.3 TOTP Java代码片段示例

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64; // 用于解码Base32密钥

public class TotpUtil {

    private static final String ALGORITHM = "HmacSHA1"; // RFC 6238 推荐使用HMAC-SHA1
    private static final int TIME_STEP = 30; // 时间步长，通常30秒

    /**
     * 生成TOTP
     * @param secretKey 共享秘密密钥 (字节数组)
     * @param currentTimeMillis 当前时间戳 (毫秒)
     * @param digits OTP位数 (通常是6或8)
     * @return 生成的OTP字符串
     */
    public static String generateTOTP(byte[] secretKey, long currentTimeMillis, int digits)
            throws NoSuchAlgorithmException, InvalidKeyException {

        // 1. 计算时间计数器 TC
        long T = currentTimeMillis / 1000; // 转换为秒
        long TC = T / TIME_STEP; // 获取时间步长对应的整数值

        // 2. 调用HOTP逻辑生成OTP
        // HOTPUtil中的generateHOTP方法可以直接复用
        return HotpUtil.generateHOTP(secretKey, TC, digits);
    }

    /**
     * 将Base32编码的密钥转换为字节数组
     * @param base32Key Base32编码的密钥字符串
     * @return 字节数组密钥
     */
    public static byte[] decodeBase32(String base32Key) {
        // Base32 编码通常不包含填充字符'='，但如果包含，需要处理
        base32Key = base32Key.toUpperCase().replace(" ", "").replace("=", ""); // 清理空格和填充
        // JDK中没有直接的Base32解码器，通常需要引入第三方库（如Apache Commons Codec），
        // 这里为了示例简化，假设是一个简单的Base32编码（或手动转换，实际生产不推荐）
        // 实际上，RFC 4648 Base32 是有固定字符集的，以下只是一个示意。
        // 对于真实项目，请使用 org.apache.commons.codec.binary.Base32.decode()
        // 或 com.google.zxing.client.result.ParsedResult.decodeBase32() 等库
        
        // 这是一个简化的、非标准的Base32解码，仅用于演示概念。
        // 实际使用请引入成熟的Base32库。
        // byte[] decoded = Base32.decode(base32Key); // 假设存在这样的标准方法
        
        // 由于JDK原生不支持，这里用一个非常粗略的Base64替代（仅为演示数据流，并非真实的Base32解码）
        // 请勿在生产环境使用此方法进行Base32解码！
        System.err.println("Warning: Using non-standard Base32 decoding for demo. Use a proper library like Apache Commons Codec for production.");
        return Base64.getDecoder().decode(base32Key.getBytes()); // 这是一个错误的Base32解码示例，仅为编译通过
    }


    public static void main(String[] args) throws Exception {
        // 示例：Google Authenticator的密钥通常以Base32编码
        // 假设这是一个通过二维码扫描或手动输入的密钥（通常是20字节的随机数据）
        // 注意：Base32密钥通常是16到20个字符，对应10到12.5字节的秘密数据
        // RFC 6238 推荐至少128位（16字节）的秘密密钥
        String base32EncodedSecret = "JBSWY3DPEHPK3PXP"; // 对应secretKey.getBytes() if it's 10 bytes
        // For a real 16-byte secret, example: Base32.encode(new byte[16]) -> "GEZDGNBVGYQTCMZXGEZDGNBVGYQTCMZX"
        
        // 在真实项目中，应该使用一个标准的Base32解码库，例如：
        // byte[] secret = new Base32().decode(base32EncodedSecret);
        // 这里为了示例能运行，我们直接使用一个固定的字节数组作为secret，因为它与上述generateHOTP的secretKey参数类型一致
        byte[] secret = "abcdefghijklmnop".getBytes(); // 16字节的示例密钥，确保长度足够
        
        System.out.println("---- TOTP Generation ----");
        // 服务器端生成并验证OTP
        long currentUnixTime = System.currentTimeMillis();
        String otp = generateTOTP(secret, currentUnixTime, 6);
        System.out.println("Current Time: " + currentUnixTime + ", Generated OTP: " + otp);

        // 模拟客户端在几秒后提交OTP
        long clientSubmitTime = System.currentTimeMillis() + 5 * 1000; // 5秒后提交
        String clientOtp = generateTOTP(secret, clientSubmitTime, 6); // 客户端生成的OTP

        System.out.println("Client Time (5s later): " + clientSubmitTime + ", Client Generated OTP: " + clientOtp);

        // 服务器端验证：通常会检查当前时间步长及其前后一个步长的OTP
        System.out.println("\n---- TOTP Verification ----");
        boolean verified = false;
        long serverTime = System.currentTimeMillis(); // 服务器当前时间
        int timeWindowTolerance = 1; // 允许前后一个时间步长的偏差

        for (int i = -timeWindowTolerance; i <= timeWindowTolerance; i++) {
            long targetTime = serverTime + (long)i * TIME_STEP * 1000; // 计算目标时间
            String expectedOtp = generateTOTP(secret, targetTime, 6);
            if (expectedOtp.equals(clientOtp)) {
                verified = true;
                System.out.println("Verification successful for time offset: " + i);
                break;
            }
        }

        if (verified) {
            System.out.println("TOTP Verified successfully.");
        } else {
            System.out.println("TOTP Verification failed.");
        }
    }
}
```
**重要提示：** 上述 `decodeBase32` 方法仅为示例代码的编译通过而提供了一个**错误且不安全**的实现（使用了Base64代替）。在生产环境中，**请务必使用成熟的第三方Base32解码库**，例如 Apache Commons Codec 库中的 `org.apache.commons.codec.binary.Base32`。

### 总结

TOTP和HOTP算法虽然复杂，但其核心思想都离不开共享秘密密钥和动态变化的输入（计数器或时间戳），并通过加密哈希函数（HMAC-SHA1）来生成不可预测的一次性密码。

* **HOTP** 依赖于严格的**计数器同步**，适用于物理令牌等场景，但需要考虑同步漂移问题。
* **TOTP** 则通过引入**时间因素**，大大简化了同步的复杂性，成为目前最主流的基于软件的一次性密码解决方案（如Google Authenticator）。

理解这些算法的底层工作原理，有助于我们更好地设计和集成MFA功能到IAM系统中，并对其安全性有更深刻的认识。在实际开发中，强烈建议使用经过充分测试和审计的第三方安全库来处理OTP的生成和验证，避免自己实现可能引入的漏洞。下一篇我们将探讨FIDO与WebAuthn技术。

###

**欢迎关注+点赞+推荐+转发**