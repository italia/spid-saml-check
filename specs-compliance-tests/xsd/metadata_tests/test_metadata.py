import unittest
import pathlib

try:
    import xmlschema
except ImportError:
    xmlschema = None


@unittest.skipIf(xmlschema is None, "xmlschema library is not installed")
class TestMetadata(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        parent_dir = pathlib.Path(__file__).parent.parent

        cls.md_av29_schema = xmlschema.XMLSchema(
            str(parent_dir.joinpath("saml-schema-metadata-sp-spid-av29.xsd"))
        )
        cls.md_av29_fix_schema = xmlschema.XMLSchema(
            str(parent_dir.joinpath("saml-schema-metadata-sp-spid-av29-fix.xsd"))
        )
        cls.md_av29_wip_schema = xmlschema.XMLSchema(
            str(parent_dir.joinpath("saml-schema-metadata-sp-spid-av29-wip.xsd"))
        )
        cls.md_av29_redefined_schema = xmlschema.XMLSchema11(
            str(parent_dir.joinpath("saml-schema-metadata-sp-spid-av29-redefine.xsd"))
        )

    def test_with_original_av29_schema(self):
        self.assertFalse(
            self.md_av29_schema.is_valid('metadata_tests/satosa-saml2spid-billing-xml'))

        with self.assertRaises(xmlschema.XMLSchemaValidationError) as ctx:
            self.md_av29_schema.validate('metadata_tests/satosa-saml2spid-billing-xml')
        msg = str(ctx.exception)
        self.assertIn('Tag (spid:Public | spid:Private) expected', msg)
        self.assertIn('Path: /md:EntityDescriptor/md:SPSSODescriptor/md:Extensions', msg)

        self.assertFalse(
            self.md_av29_schema.is_valid('metadata_tests/satosa-saml2spid-other-xml'))

        with self.assertRaises(xmlschema.XMLSchemaValidationError) as ctx:
            self.md_av29_schema.validate('metadata_tests/satosa-saml2spid-other-xml')
        msg = str(ctx.exception)
        self.assertIn('Tag (spid:Public | spid:Private) expected', msg)
        self.assertIn('Path: /md:EntityDescriptor/md:SPSSODescriptor/md:Extensions', msg)

        self.assertFalse(
            self.md_av29_schema.is_valid('metadata_tests/spid-django-billing.xml'))

        with self.assertRaises(xmlschema.XMLSchemaValidationError) as ctx:
            self.md_av29_schema.validate('metadata_tests/spid-django-billing.xml')
        msg = str(ctx.exception)
        self.assertIn('Tag (spid:Public | spid:Private) expected', msg)
        self.assertIn('Path: /md:EntityDescriptor/md:ContactPerson/md:Extensions', msg)

        self.assertTrue(
            self.md_av29_schema.is_valid('metadata_tests/spid-django-other.xml'))

    def test_with_fixed_schema(self):
        self.assertTrue(
            self.md_av29_fix_schema.is_valid('metadata_tests/satosa-saml2spid-billing-xml'))
        self.assertTrue(
            self.md_av29_fix_schema.is_valid('metadata_tests/satosa-saml2spid-other-xml'))
        self.assertTrue(
            self.md_av29_fix_schema.is_valid('metadata_tests/spid-django-billing.xml'))
        self.assertTrue(
            self.md_av29_fix_schema.is_valid('metadata_tests/spid-django-other.xml'))

    def test_with_minimal_changed_schema(self):
        self.assertTrue(
            self.md_av29_wip_schema.is_valid('metadata_tests/satosa-saml2spid-billing-xml'))
        self.assertTrue(
            self.md_av29_wip_schema.is_valid('metadata_tests/satosa-saml2spid-other-xml'))
        self.assertTrue(
            self.md_av29_wip_schema.is_valid('metadata_tests/spid-django-billing.xml'))
        self.assertTrue(
            self.md_av29_wip_schema.is_valid('metadata_tests/spid-django-other.xml'))

    def test_with_redefined_schema(self):
        self.assertTrue(
            self.md_av29_redefined_schema.is_valid('metadata_tests/satosa-saml2spid-billing-xml'))
        self.assertTrue(
            self.md_av29_redefined_schema.is_valid('metadata_tests/satosa-saml2spid-other-xml'))
        self.assertTrue(
            self.md_av29_redefined_schema.is_valid('metadata_tests/spid-django-billing.xml'))
        self.assertTrue(
            self.md_av29_redefined_schema.is_valid('metadata_tests/spid-django-other.xml'))


if __name__ == '__main__':
    unittest.main()
