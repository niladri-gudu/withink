import CommonCrypto
import ExpoModulesCore

/**
 * Native PBKDF2-HMAC-SHA256 via CommonCrypto, dispatched on an Expo module
 * queue. Byte-compatible with Node/WebCrypto; the known-answer self-test in
 * `src/index.ts` refuses to use the module if a platform build ever diverges.
 */
public class WithinkCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WithinkCrypto")

    AsyncFunction("pbkdf2Sha256") { (password: String, saltHex: String, iterations: Int) -> String in
      guard iterations > 0 else {
        throw InvalidIterationsException()
      }

      let passwordBytes = Array(password.utf8)
      let salt = try hexToBytes(saltHex)
      var derived = [UInt8](repeating: 0, count: 32)

      let status = derived.withUnsafeMutableBufferPointer { derivedBuffer in
        salt.withUnsafeBufferPointer { saltBuffer in
          CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordBytes.map { Int8(bitPattern: $0) },
            passwordBytes.count,
            saltBuffer.baseAddress,
            salt.count,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
            UInt32(iterations),
            derivedBuffer.baseAddress,
            derived.count
          )
        }
      }

      guard status == kCCSuccess else {
        throw KeyDerivationException(status)
      }

      return derived.map { String(format: "%02x", $0) }.joined()
    }
  }

  private func hexToBytes(_ hex: String) throws -> [UInt8] {
    guard hex.count % 2 == 0 else {
      throw InvalidSaltException()
    }
    var bytes = [UInt8]()
    bytes.reserveCapacity(hex.count / 2)
    var index = hex.startIndex
    while index < hex.endIndex {
      let next = hex.index(index, offsetBy: 2)
      guard let byte = UInt8(hex[index..<next], radix: 16) else {
        throw InvalidSaltException()
      }
      bytes.append(byte)
      index = next
    }
    return bytes
  }
}

final class InvalidIterationsException: Exception {
  override var reason: String {
    "iterations must be positive"
  }
}

final class InvalidSaltException: Exception {
  override var reason: String {
    "salt must be even-length hex"
  }
}

final class KeyDerivationException: Exception {
  private let status: Int32

  init(_ status: Int32) {
    self.status = status
    super.init()
  }

  override var reason: String {
    "PBKDF2 failed with status \(status)"
  }
}
