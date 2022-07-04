export const encodeStd = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
export const encodeURL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

export const StdPadding = '='.charCodeAt(0)
export const NoPadding = -1

const CR = '\r'
const LF = '\n'

const _r = CR.charCodeAt(0)
const _n = LF.charCodeAt(0)

export class Base64 {
	private readonly strict: boolean;
	private readonly padding: number;
	private readonly decoder: Uint8Array;
	private readonly encoder: Uint8Array;
	
	constructor(alphabet: string, padding = StdPadding, strict = false) {
		if (alphabet.length !== 64) {
			throw new Error("Alphabet must be 64 characters long")
		}
		if (padding > 0xff || padding === _r || padding === _n) {
			throw new Error("invalid padding")
		}
		alphabet.split('').forEach((c) => {
			if (c === CR || c === LF) {
				throw new Error("Alphabet cannot contain '='")
			}
			if (c.charCodeAt(0) === padding) {
				throw new Error("padding contained in alphabet")
			}
		})
		
		this.strict = strict;
		this.padding = padding;
		
		this.encoder = new Uint8Array(Array<number>(64))
		for (let i = 0; i < alphabet.length; i++) {
			this.encoder[i] = alphabet.charCodeAt(i);
		}
		
		this.decoder = new Uint8Array(Array<number>(256))
		for (let i = 0; i < 256; i++) {
			this.decoder[i] = 0xFF
		}
		for (let i = 0; i < this.encoder.length; i++) {
			this.decoder[this.encoder[i]] = i
		}
	}
	
	public EncodeToString(src: Buffer) {return Buffer.from(this.Encode(src)).toString()}
	
	public DecodeString(src: string) {return this.Decode(Buffer.from(src))}
	
	public Encode(src: Buffer): Uint8Array {
		const dst = this.getEncBuffer(src.length)
		let {di, si} = {di: 0, si: 0}
		const n = Math.floor(src.length / 3) * 3
		
		while (si < n) {
			const val = (src[si]) << 16 | (src[si + 1]) << 8 | src[si + 2]
			
			dst[di] = this.encoder[val >> 18 & 0x3F]
			dst[di + 1] = this.encoder[val >> 12 & 0x3F]
			dst[di + 2] = this.encoder[val >> 6 & 0x3F]
			dst[di + 3] = this.encoder[val & 0x3F]
			
			si += 3
			di += 4
		}
		
		const remain = src.length - si
		if (remain === 0) {
			return dst
		}
		
		let val = src[si] << 16
		if (remain === 2) {
			val |= src[si + 1] << 8
		}
		
		dst[di] = this.encoder[val >> 18 & 0x3F]
		dst[di + 1] = this.encoder[val >> 12 & 0x3F]
		
		switch (remain) {
			case 2:
				dst[di + 2] = this.encoder[val >> 6 & 0x3F]
				if (this.padding !== NoPadding) {
					dst[di + 3] = this.padding
				}
				break
			case 1:
				if (this.padding !== NoPadding) {
					dst[di + 2] = this.padding
					dst[di + 3] = this.padding
				}
		}
		
		return dst
	}
	
	public Decode(src: Buffer): Uint8Array {
		let {si, n} = {si: 0, n: 0}
		const dst = this.getDecBuffer(src.length)
		
		while (src.length - si >= 4 && dst.length - n >= 4) {
			const src2 = src.subarray(si, si + 4)
			const {dn, ok} = assemble32(
				this.decoder[src2[0]],
				this.decoder[src2[1]],
				this.decoder[src2[2]],
				this.decoder[src2[3]]
			)
			
			if (ok) {
				dst[n] = dn >> 24
				dst[n + 1] = dn >> 16
				dst[n + 2] = dn >> 8
				dst[n + 3] = dn
				
				n += 3
				si += 4
				continue
			}
			const res = this.decodeQuantum(dst.subarray(n), src, si)
			si = res.nsi
			n += res.n
		}
		
		while (si < src.length) {
			const res = this.decodeQuantum(dst.subarray(n), src, si)
			si = res.nsi
			n += res.n
		}
		
		return dst.subarray(0, n)
	}
	
	private getEncBuffer(len: number): Uint8Array {
		if (this.padding === NoPadding) {
			return new Uint8Array(Array<number>(Math.floor((len * 8 + 5) / 6)).fill(0))
		}
		return new Uint8Array(Array<number>(Math.floor((len + 2) / 3) * 4).fill(0))
	}
	
	private getDecBuffer(len: number): Uint8Array {
		if (this.padding === NoPadding) {
			return new Uint8Array(Array<number>(Math.floor(len * 6 / 8)).fill(0))
		}
		return new Uint8Array(Array<number>(Math.floor(len / 4) * 3).fill(0))
	}
	
	private decodeQuantum(dst: Uint8Array, src: Uint8Array, si: number): { nsi: number, n: number } {
		const buf = new Uint8Array(Array<number>(4).fill(0))
		let len = 4
		
		for (let j = 0; j < buf.length; j++) {
			if (src.length === si) {
				if (j === 0) {
					return {nsi: si, n: 0}
				}
				if (j === 1 || this.padding !== NoPadding) {
					throw new Error("illegal base64 data at input byte")
				}
				len = j
				break
			}
			
			const _in = src[si]
			si++
			
			const out = this.decoder[_in]
			if (out !== 0xFF) {
				buf[j] = out
				continue
			}
			
			if (_in === _r || _in === _n) {
				j--
				continue
			}
			if (_in !== this.padding) {
				throw new Error("illegal base64 data at input byte")
			}
			
			switch (j) {
				case 0:
					throw new Error("illegal base64 data at input byte")
				case 1:
					throw new Error("illegal base64 data at input byte")
				case 2:
					while (si < src.length && (src[si] === _r || src[si] === _n)) {
						si++
					}
					if (si === src.length) {
						throw new Error("illegal base64 data at input byte")
					}
					if (src[si] !== this.padding) {
						throw new Error("illegal base64 data at input byte")
					}
					si++
			}
			
			while (si < src.length && (src[si] === _r || src[si] === _n)) {
				si++
			}
			if (si < src.length) {
				throw new Error("illegal base64 data at input byte")
			}
			
			len = j
			break
		}
		
		const val = buf[0] << 18 | buf[1] << 12 | buf[2] << 6 | buf[3]
		buf[2] = (val >> 0)
		buf[1] = (val >> 8)
		buf[0] = (val >> 16)
		
		switch (len) {
			case 4:
				dst[2] = buf[2]
				buf[2] = 0
			case 3:
				dst[1] = buf[1]
				if (this.strict && buf[2] === 0) {
					throw new Error("illegal base64 data at input byte")
				}
				buf[1] = 0
			case 2:
				dst[0] = buf[0]
				if (this.strict && (buf[1] !== 0 || buf[2] !== 0)) {
					throw new Error("illegal base64 data at input byte")
				}
		}
		
		return {nsi: si, n: len - 1}
	}
}

const assemble32 = (n1: number, n2: number, n3: number, n4: number): { dn: number, ok: boolean } => {
	if ((n1 | n2 | n3 | n4) === 0xff) {
		return {dn: 0, ok: false}
	}
	return {dn: n1 << 26 | n2 << 20 | n3 << 14 | n4 << 8, ok: true}
}

export const StdEncoding = new Base64(encodeStd)
export const URLEncoding = new Base64(encodeURL)
export const RawStdEncoding = new Base64(encodeStd, NoPadding)
export const RawURLEncoding = new Base64(encodeURL, NoPadding)
