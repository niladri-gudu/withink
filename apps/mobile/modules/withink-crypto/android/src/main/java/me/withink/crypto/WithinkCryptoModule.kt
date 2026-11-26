package me.withink.crypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.charset.StandardCharsets
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Native PBKDF2-HMAC-SHA256.
 *
 * `AsyncFunction` runs on a background thread, so the 600k-iteration production
 * derivation no longer occupies the JS thread (or needs a hidden WebView).
 * The implementation follows RFC 8018 §5.2 and is pinned by the known-answer
 * self-test in `src/index.ts`.
 */
class WithinkCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WithinkCrypto")

    AsyncFunction("pbkdf2Sha256") { password: String, saltHex: String, iterations: Int ->
      require(iterations > 0) { "iterations must be positive" }
      pbkdf2Sha256(
        password.toByteArray(StandardCharsets.UTF_8),
        hexToBytes(saltHex),
        iterations,
        KEY_BYTES,
      )
    }
  }

  private fun hexToBytes(hex: String): ByteArray {
    require(hex.length % 2 == 0) { "salt must be even-length hex" }
    val bytes = ByteArray(hex.length / 2)
    for (index in bytes.indices) {
      val high = Character.digit(hex[index * 2], 16)
      val low = Character.digit(hex[index * 2 + 1], 16)
      require(high >= 0 && low >= 0) { "salt must be hex" }
      bytes[index] = ((high shl 4) or low).toByte()
    }
    return bytes
  }

  private fun pbkdf2Sha256(
    password: ByteArray,
    salt: ByteArray,
    iterations: Int,
    length: Int,
  ): String {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(password, "HmacSHA256"))

    val hashLength = mac.macLength
    val blockCount = (length + hashLength - 1) / hashLength
    val derived = ByteArray(blockCount * hashLength)
    val blockIndex = ByteArray(4)

    for (block in 1..blockCount) {
      blockIndex[0] = (block ushr 24).toByte()
      blockIndex[1] = (block ushr 16).toByte()
      blockIndex[2] = (block ushr 8).toByte()
      blockIndex[3] = block.toByte()

      mac.update(salt)
      mac.update(blockIndex)
      var u = mac.doFinal()
      val t = u.copyOf()

      for (round in 2..iterations) {
        u = mac.doFinal(u)
        for (index in t.indices) {
          t[index] = (t[index].toInt() xor u[index].toInt()).toByte()
        }
      }

      System.arraycopy(t, 0, derived, (block - 1) * hashLength, hashLength)
    }

    val key = if (derived.size == length) derived else derived.copyOf(length)
    val hex = StringBuilder(length * 2)
    for (byte in key) {
      hex.append(HEX_DIGITS[(byte.toInt() shr 4) and 0x0f])
      hex.append(HEX_DIGITS[byte.toInt() and 0x0f])
    }
    return hex.toString()
  }

  private companion object {
    const val KEY_BYTES = 32
    val HEX_DIGITS = "0123456789abcdef".toCharArray()
  }
}
