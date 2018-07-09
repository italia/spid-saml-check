import lxml.objectify


def del_ns(tree):
    root = tree.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)


def found(val):
    return "Found: %s" % val


def dump_failures(failures):
    return '\n'.join([
        '\n',
        '  ________________________________________   ',
        '/ Hey, there was a failure! Take a look in \\',
        '\\ the list below...                        / ',
        '  ----------------------------------------   ',
        '         \\   ^__^                            ',
        '          \\  (oo)\\_______                    ',
        '             (__)\\       )\\/\\                ',
        '                 ||----w |                   ',
        '                 ||     ||                   ',
        '\n',
        '\n'.join(failures),
    ])
