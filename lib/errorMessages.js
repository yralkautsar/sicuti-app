// Error message mapper — convert DB errors to user-friendly messages
export function getUserFriendlyErrorMessage(error) {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.'

  const msg = error.message?.toLowerCase() || ''

  // Duplicate key errors
  if (msg.includes('duplicate') || msg.includes('unique')) {
    if (msg.includes('classes')) {
      return 'Nama kelas sudah ada untuk tahun ajaran ini. Gunakan nama berbeda.'
    }
    if (msg.includes('student')) {
      return 'Data murid ini sudah ada. Periksa kembali NISN atau nama murid.'
    }
    if (msg.includes('profile')) {
      return 'Data guru ini sudah ada. Periksa kembali email atau nama.'
    }
    return 'Data ini sudah ada di sistem. Gunakan data yang berbeda.'
  }

  // Not null violations
  if (msg.includes('not-null') || msg.includes('not null')) {
    return 'Semua field wajib diisi. Periksa kembali formulir.'
  }

  // Foreign key violations
  if (msg.includes('foreign key') || msg.includes('violates')) {
    return 'Data yang direferensikan tidak ditemukan. Pastikan kelas dan guru sudah terdaftar.'
  }

  // Permission denied (RLS)
  if (msg.includes('permission denied') || msg.includes('check authorization')) {
    return 'Akses ditolak. Hubungi admin untuk memeriksa izin Anda.'
  }

  // Network/connection errors
  if (msg.includes('network') || msg.includes('offline')) {
    return 'Koneksi internet tidak stabil. Periksa koneksi dan coba lagi.'
  }

  // Timeout
  if (msg.includes('timeout')) {
    return 'Permintaan memakan waktu terlalu lama. Coba lagi dalam beberapa detik.'
  }

  // Invalid data
  if (msg.includes('invalid') || msg.includes('format')) {
    return 'Format data tidak valid. Periksa kembali dan coba lagi.'
  }

  // Rate limit
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi.'
  }

  // File upload errors
  if (msg.includes('file')) {
    return 'Terjadi kesalahan saat mengupload file. Periksa ukuran dan format file.'
  }

  // Default fallback
  return 'Terjadi kesalahan. Hubungi admin jika masalah berlanjut.'
}
