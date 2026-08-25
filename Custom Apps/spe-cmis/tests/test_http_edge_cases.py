"""
Regression test for HTTP wire-protocol edge cases in the CMIS query action.

Covers issues found only by testing against real-world HTTP clients (not just
cmislib), e.g. Apache Chemistry OpenCMIS Workbench, which sends chunked
Transfer-Encoding requests and the 'statement' field name instead of 'q':

  1. 'statement' accepted as an alias for the 'q' query field.
  2. Chunked Transfer-Encoding requests (no Content-Length) are read correctly
     (requires Azure Functions Node.js HTTP Streams to be enabled).
  3. Content-Type charset casing/params (e.g. 'charset=UTF-8') don't break
     form parsing.

Run with:
  python test_http_edge_cases.py
"""
import sys
import requests
from config import load_config, get_cmis_url


def _check_query_response(label, response):
    """Assert the response is a successful CMIS query result (an objectList
    with an 'objects' array), not just any 2xx status."""
    ok = True
    if response.status_code != 200:
        print(f'  FAILED: {label} expected status 200, got {response.status_code}')
        ok = False
        return ok
    try:
        body = response.json()
    except ValueError:
        print(f'  FAILED: {label} response body is not valid JSON: {response.text[:200]}')
        return False
    if 'objects' not in body or not isinstance(body['objects'], list):
        print(f'  FAILED: {label} response missing "objects" array: {body}')
        ok = False
    return ok


def main():
    config = load_config()
    base_url = get_cmis_url(config)
    auth = (config['username'], config['password'])

    repo_id = input("Enter repository ID to query (from getRepositories): ").strip()
    url = f'{base_url}/{repo_id}'

    failures = []

    # 1. 'statement' field alias for 'q'
    r1 = requests.post(url, auth=auth, data={
        'cmisaction': 'query',
        'statement': "SELECT * FROM cmis:document",
    })
    print('1. statement-alias status:', r1.status_code, r1.text[:200])
    if not _check_query_response('statement-alias', r1):
        failures.append('statement-alias')

    # 2. Simulate a client that uses chunked transfer-encoding with no Content-Length
    def gen():
        yield b'cmisaction=query&q=' + b'SELECT+*+FROM+cmis%3Adocument'

    r2 = requests.post(url, auth=auth, data=gen(), headers={'Content-Type': 'application/x-www-form-urlencoded'})
    print('2. chunked-transfer status:', r2.status_code, r2.text[:200])
    if not _check_query_response('chunked-transfer', r2):
        failures.append('chunked-transfer')

    # 3. Simulate a client sending charset uppercase / different casing content-type
    r3 = requests.post(url, auth=auth, data='cmisaction=query&q=SELECT+*+FROM+cmis%3Adocument',
                        headers={'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'})
    print('3. charset-uppercase status:', r3.status_code, r3.text[:200])
    if not _check_query_response('charset-uppercase', r3):
        failures.append('charset-uppercase')

    if failures:
        print(f'\nRESULT: FAILED ({len(failures)}/3 checks): {", ".join(failures)}')
        sys.exit(1)
    print('\nRESULT: PASSED (3/3 checks)')


if __name__ == '__main__':
    main()
