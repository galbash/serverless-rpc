#!/usr/bin/env python
import re
import os
from setuptools import setup, find_packages

try:
    # For pip >= 10.
    from pip._internal.req import parse_requirements
    from pip._internal.download import PipSession
except ImportError:
    # For pip <= 9.0.3.
    from pip.req import parse_requirements
    from pip.download import PipSession

install_reqs = parse_requirements('./requirements.txt', session=PipSession())
reqs = [str(ir.req) for ir in install_reqs]

# Get version
with open(os.path.join('serverless_thrift', '__init__.py'), 'rt') as init_file:
    version = re.search(r'__version__ = \'(.*?)\'', init_file.read()).group(1)

setup(
    name='serverless-thrift',
    version=version,
    description='Run Thrift server and client on serverless functions',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author='Gal Bashan & Tal Vintrob',
    author_email='galbashan1@gmail.com',
    url='https://github.com/galbash/serverless-rpc',
    packages=find_packages(exclude=('test', 'example')),
    install_requires=reqs,
    license='MIT',
    keywords=[
        'serverless',
        'lambda',
        'aws-lambda',
        'rpc',
        'thrift',
    ],
    classifiers=(
        'Intended Audience :: Developers',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Software Development :: Libraries',
        'Topic :: Software Development :: Libraries :: Python Modules',
    )
)
