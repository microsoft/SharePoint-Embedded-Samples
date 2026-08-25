"""
Ad-hoc validation script for the newly implemented CMIS feature gaps:
typeDefinitions, query, ACL discover/manage, versioning (checkOut/checkIn/
cancelCheckOut). Run with output redirected to a file:
  python test_gaps.py > out.txt 2>&1
"""
import sys
import traceback
from config import load_config, get_cmis_url
from cmis_client import create_client, get_repositories, find_repository_by_name


def main():
    config = load_config()
    client = create_client(config)
    repositories = get_repositories(client)
    repo_info = find_repository_by_name(client, repositories, config['container_name'])
    if not repo_info:
        print("Repository not found, aborting.")
        sys.exit(1)
    repo = repo_info

    failures = []

    print("\n" + "=" * 60)
    print("1. Type Definitions")
    print("=" * 60)
    try:
        doc_type = repo.getTypeDefinition('cmis:document')
        print(f"cmis:document type: baseId={doc_type.getBaseId()}, "
              f"propCount={len(doc_type.getProperties())}")
        folder_type = repo.getTypeDefinition('cmis:folder')
        print(f"cmis:folder type: baseId={folder_type.getBaseId()}")

        children = repo.getTypeChildren()
        child_ids = [t.getTypeId() for t in children]
        print(f"typeChildren (root): {child_ids}")

        descendants = repo.getTypeDescendants()
        print(f"typeDescendants (root) count: {len(descendants)}")
    except Exception as e:
        print(f"FAILED: {e}")
        traceback.print_exc()
        failures.append('Type Definitions')

    print("\n" + "=" * 60)
    print("2. Query")
    print("=" * 60)
    try:
        root = repo.getObjectByPath('/')
        # Matches the bundled sample_data/ files (welcome.txt, Reports/quarterly-summary.txt)
        results = repo.query("select * from cmis:document where cmis:name like '%.txt'")
        names = [r.getName() for r in results]
        print(f"Query '%.txt' matched {len(names)}: {names}")
    except Exception as e:
        print(f"FAILED: {e}")
        traceback.print_exc()
        failures.append('Query')

    print("\n" + "=" * 60)
    print("3. ACL discover + manage")
    print("=" * 60)
    test_folder = None
    try:
        root = repo.getObjectByPath('/')
        test_folder = root.createFolder('gap-test-acl')
        acl = test_folder.getACL()
        print(f"Initial ACL aces: {len(acl.getEntries())}")

        # applyACL: add read access for the test user (self) - best effort,
        # since we don't have a second test user handy; this exercises the
        # applyACL wire format even if the principal already effectively
        # has access.
        username = config['username']
        acl.addEntry(username, 'cmis:read', True)
        result_acl = test_folder.applyACL(acl)
        print(f"applyACL succeeded, aces now: {len(result_acl.getEntries())}")
    except Exception as e:
        print(f"FAILED: {e}")
        traceback.print_exc()
        failures.append('ACL discover + manage')

    print("\n" + "=" * 60)
    print("4. Versioning (checkOut/checkIn/cancelCheckOut)")
    print("=" * 60)
    test_doc = None
    try:
        root = repo.getObjectByPath('/')
        test_doc = root.createDocumentFromString('gap-test-checkout.txt', contentString='v1', contentType='text/plain')
        pwc = test_doc.checkout()
        print(f"Checked out, PWC id: {pwc.getObjectId()}")
        updated = pwc.checkin(checkinComment='test checkin')
        print(f"Checked in: {updated.getName()}")

        test_doc2 = root.createDocumentFromString('gap-test-cancel.txt', contentString='v1', contentType='text/plain')
        pwc2 = test_doc2.checkout()
        pwc2.cancelCheckout()
        print("Cancel checkout succeeded")
    except Exception as e:
        print(f"FAILED: {e}")
        traceback.print_exc()
        failures.append('Versioning')

    print("\n" + "=" * 60)
    print("Cleanup")
    print("=" * 60)
    try:
        if test_folder:
            test_folder.deleteTree()
            print("Deleted gap-test-acl folder")
    except Exception as e:
        print(f"Cleanup folder failed: {e}")
    try:
        root = repo.getObjectByPath('/')
        for name in ['gap-test-checkout.txt', 'gap-test-cancel.txt']:
            try:
                obj = root.getChildren()
            except Exception:
                pass
        # Delete by re-fetching root children and matching name
        for child in root.getChildren():
            if child.getName() in ('gap-test-checkout.txt', 'gap-test-cancel.txt'):
                child.delete()
                print(f"Deleted {child.getName()}")
    except Exception as e:
        print(f"Cleanup docs failed: {e}")

    print("\n" + "=" * 60)
    if failures:
        print(f"RESULT: FAILED ({len(failures)}/4 checks): {', '.join(failures)}")
        print("=" * 60)
        sys.exit(1)
    print("RESULT: PASSED (4/4 checks)")
    print("=" * 60)


if __name__ == '__main__':
    main()
