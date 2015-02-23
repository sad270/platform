<?php

namespace Oro\Component\Layout\Tests\Unit;

use Oro\Component\Layout\LayoutContext;

class LayoutContextTest extends \PHPUnit_Framework_TestCase
{
    /** @var LayoutContext */
    protected $context;

    protected function setUp()
    {
        $this->context = new LayoutContext();
    }

    /**
     * @dataProvider valueDataProvider
     */
    public function testGetSetHasRemove($value)
    {
        $this->assertFalse(
            $this->context->has('test'),
            'Failed asserting that a value does not exist in the context'
        );
        $this->assertFalse(
            isset($this->context['test']),
            'Failed asserting that a value does not exist in the context (ArrayAccess)'
        );
        $this->context->set('test', $value);
        $this->assertTrue(
            $this->context->has('test'),
            'Failed asserting that a value exists in the context'
        );
        $this->assertTrue(
            isset($this->context['test']),
            'Failed asserting that a value does not exist in the context (ArrayAccess)'
        );
        $this->assertSame(
            $value,
            $this->context->get('test'),
            'Failed asserting that added to the context value equals to the value returned by "get" method'
        );
        $this->assertSame(
            $value,
            $this->context['test'],
            'Failed asserting that added to the context value equals to the value returned by ArrayAccess get'
        );

        $this->context['test1'] = $value;
        $this->assertSame(
            $value,
            $this->context->get('test1'),
            'Failed asserting that set by ArrayAccess value equals to the value returned by "get" method'
        );
        $this->assertSame(
            $value,
            $this->context['test1'],
            'Failed asserting that set by ArrayAccess value equals to the value returned by ArrayAccess get'
        );

        $this->context->remove('test');
        $this->assertFalse(
            $this->context->has('test'),
            'Failed asserting that a value was removed the context'
        );
        unset($this->context['test1']);
        $this->assertFalse(
            $this->context->has('test1'),
            'Failed asserting that a value was removed the context (ArrayAccess)'
        );
    }

    public function valueDataProvider()
    {
        return [
            [null],
            [123],
            ['val'],
            [[]],
            [[1, 2, 3]],
            [new \stdClass()]
        ];
    }

    public function testHasForUnknownItem()
    {
        $this->assertFalse($this->context->has('test'));
    }

    /**
     * @expectedException \OutOfBoundsException
     * @expectedExceptionMessage Undefined index: test.
     */
    public function testGetUnknownItem()
    {
        $this->context->get('test');
    }

    public function testGetOr()
    {
        $this->assertNull($this->context->getOr('test'));
        $this->assertEquals(123, $this->context->getOr('test', 123));
        $this->context->set('test', 'val');
        $this->assertEquals('val', $this->context->getOr('test'));
    }

    public function testResolve()
    {
        $this->context->set('test', 'val');

        $this->context->getDataResolver()
            ->setOptional(['test'])
            ->setNormalizers(
                [
                    'test' => function ($options, $val) {
                        return $val . '_normalized';
                    }
                ]
            );
        $this->context->resolve();

        $this->assertEquals('val_normalized', $this->context['test']);
    }

    /**
     * @expectedException \Oro\Component\Layout\Exception\LogicException
     * @expectedExceptionMessage Failed to resolve the context data.
     */
    public function testResolveThrowsExceptionWhenInvalidData()
    {
        $this->context->set('test', 'val');
        $this->context->resolve();
    }

    /**
     * @expectedException \Oro\Component\Layout\Exception\LogicException
     * @expectedExceptionMessage The context data are already resolved.
     */
    public function testResolveThrowsExceptionWhenDataAlreadyResolved()
    {
        $this->context->resolve();
        $this->context->resolve();
    }

    public function testIsResolved()
    {
        $this->assertFalse($this->context->isResolved());
        $this->context->resolve();
        $this->assertTrue($this->context->isResolved());
    }

    public function testChangeValueAllowedForResolvedData()
    {
        $this->context->getDataResolver()->setDefaults(['test' => 'default']);
        $this->context->resolve();
        $this->assertEquals('default', $this->context['test']);

        $this->context->set('test', 'Updated');
        $this->assertEquals('Updated', $this->context['test']);
    }

    /**
     * @expectedException \Oro\Component\Layout\Exception\LogicException
     * @expectedExceptionMessage The item "test" cannot be added because the context data are already resolved.
     */
    public function testAddNewValueThrowsExceptionWhenDataAlreadyResolved()
    {
        $this->context->resolve();
        $this->context->set('test', 'Updated');
    }

    public function testRemoveNotExistingValueNotThrowsExceptionForResolvedData()
    {
        $this->context->getDataResolver()->setDefaults(['test' => 'default']);
        $this->context->resolve();

        $this->context->remove('unknown');
    }

    /**
     * @expectedException \Oro\Component\Layout\Exception\LogicException
     * @expectedExceptionMessage The item "test" cannot be removed because the context data are already resolved.
     */
    public function testRemoveExistingValueThrowsExceptionWhenDataAlreadyResolved()
    {
        $this->context->getDataResolver()->setOptional(['test']);
        $this->context->set('test', 'val');
        $this->context->resolve();

        $this->context->remove('test');
    }
}
