import {StdEncoding} from "../src/base64";

export type testPair = {
	decoded: string,
	encoded: string
}

const pairs: testPair[] = [
	// RFC 3548 examples
	{decoded: "\x14\xfb\x9c\x03\xd9\x7e", encoded: "FPucA9l+"},
	{decoded: "\x14\xfb\x9c\x03\xd9", encoded: "FPucA9k="},
	{decoded: "\x14\xfb\x9c\x03", encoded: "FPucAw=="},
	
	// RFC 4648 examples
	{decoded: "", encoded: ""},
	{decoded: "f", encoded: "Zg=="},
	{decoded: "fo", encoded: "Zm8="},
	{decoded: "foo", encoded: "Zm9v"},
	{decoded: "foob", encoded: "Zm9vYg=="},
	{decoded: "fooba", encoded: "Zm9vYmE="},
	{decoded: "foobar", encoded: "Zm9vYmFy"},
	
	// Wikipedia examples
	{decoded: "sure.", encoded: "c3VyZS4="},
	{decoded: "sure", encoded: "c3VyZQ=="},
	{decoded: "sur", encoded: "c3Vy"},
	{decoded: "su", encoded: "c3U="},
	{decoded: "leasure.", encoded: "bGVhc3VyZS4="},
	{decoded: "easure.", encoded: "ZWFzdXJlLg=="},
	{decoded: "asure.", encoded: "YXN1cmUu"},
	{decoded: "sure.", encoded: "c3VyZS4="},
]

test('', () => {
	pairs.forEach(pair => {
		expect(
			StdEncoding.EncodeToString(Buffer.from(pair.decoded, 'ascii'))
		).toEqual(
			pair.encoded
		)
		
		expect(
			StdEncoding.DecodeString(pair.encoded)
		).toEqual(
			Uint8Array.from(Buffer.from(pair.decoded, 'ascii'))
		)
	})
})
