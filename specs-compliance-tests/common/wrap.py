import validators

SUCCESS = 'success'
FAILURE = 'failure'


def _result(test_case, result, val, msg):
    return {
        'result': result,
        'test': msg,
        'value': val,
    }


class TestCaseWrap(object):
    report = {}

    def _assert(self, cb, **kwargs):
        r = SUCCESS
        f = kwargs.get('first')
        m = kwargs.get('msg', None)

        try:
            if 'second' in kwargs:
                s = kwargs.get('second')
                cb(f, s, m)
            else:
                cb(f, m)
        except AssertionError as e:
            self.failures.append('[FAIL] %s' % str(e))
            r = FAILURE

        _report = self.__class__.report
        paths = self.id().split('.')
        for path in paths:
            _report = _report[path]

        _report['assertions'].append(
            _result(self, r, f, m)
        )

    def _assertIsValidHttpsUrl(self, first, msg=None):
        def cb(first, msg):
            if not validators.url(first, public=True):
                raise AssertionError(msg)
            if not first.lower().startswith('https://'):
                raise AssertionError(msg)

        self._assert(cb,
                     first=first,
                     msg=msg)

    def _assertIsValidHttpUrl(self, first, msg=None):
        def cb(first, msg):
            if not validators.url(first, public=True):
                raise AssertionError(msg)

        self._assert(cb,
                     first=first,
                     msg=msg)

    def _assertIsTLSGrade(self, first, second, msg=None):
        def cb(first, second, msg):
            location = first['location']
            service = first['service']
            data = first['data']
            if 'status' in data:
                if data['status'] == 'ERROR':
                    raise AssertionError(
                        '%s (%s, %s)' % (msg, service, data['status'])
                    )
                elif data['status'] == 'READY':
                    grade = data['endpoints'][0]['grade']
                    if grade not in second:
                        raise AssertionError(
                            '%s (%s, %s)' % (msg, service, grade)
                        )
                else:
                    raise AssertionError(
                        '%s (%s, %s)' % (msg, service, data['status'])
                    )
            else:
                raise AssertionError('%s (%s, !)' % (msg, service))

        self._assert(cb,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertTrue(self, first, msg=None):
        self._assert(self.assertTrue,
                     first=first,
                     msg=msg)

    def _assertFalse(self, first, msg=None):
        self._assert(self.assertFalse,
                     first=first,
                     msg=msg)

    def _assertGreater(self, first, second, msg=None):
        self._assert(self.assertGreater,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertLess(self, first, second, msg=None):
        self._assert(self.assertLess,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertEqual(self, first, second, msg=None):
        self._assert(self.assertEqual,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertGreaterEqual(self, first, second, msg=None):
        self._assert(self.assertGreaterEqual,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertLessEqual(self, first, second, msg=None):
        self._assert(self.assertLessEqual,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertIn(self, first, second, msg=None):
        self._assert(self.assertIn,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertNotIn(self, first, second, msg=None):
        self._assert(self.assertNotIn,
                     first=first,
                     second=second,
                     msg=msg)

    def _assertIsNone(self, first, msg=None):
        self._assert(self.assertIsNone,
                     first=first,
                     msg=msg)

    def _assertIsNotNone(self, first, msg=None):
        self._assert(self.assertIsNotNone,
                     first=first,
                     msg=msg)
