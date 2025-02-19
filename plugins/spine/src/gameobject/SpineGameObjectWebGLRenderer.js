/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2020 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var CounterClockwise = require('../../../../src/math/angle/CounterClockwise');
var GetCalcMatrix = require('../../../../src/gameobjects/GetCalcMatrix');
var RadToDeg = require('../../../../src/math/RadToDeg');
var Wrap = require('../../../../src/math/Wrap');

/**
 * Renders this Game Object with the WebGL Renderer to the given Camera.
 * The object will not render if any of its renderFlags are set or it is being actively filtered out by the Camera.
 * This method should not be called directly. It is a utility function of the Render module.
 *
 * @method SpineGameObject#renderWebGL
 * @since 3.19.0
 * @private
 *
 * @param {Phaser.Renderer.WebGL.WebGLRenderer} renderer - A reference to the current active WebGL renderer.
 * @param {SpineGameObject} src - The Game Object being rendered in this call.
 * @param {Phaser.Cameras.Scene2D.Camera} camera - The Camera that is rendering the Game Object.
 * @param {Phaser.GameObjects.Components.TransformMatrix} parentMatrix - This transform matrix is defined if the game object is nested
 */
var SpineGameObjectWebGLRenderer = function (renderer, src, camera, parentMatrix)
{
    var plugin = src.plugin;
    var skeleton = src.skeleton;
    var childAlpha = skeleton.color.a;
    var sceneRenderer = plugin.sceneRenderer;

    var GameObjectRenderMask = 15;

    var willRender = !(GameObjectRenderMask !== src.renderFlags || (src.cameraFilter !== 0 && (src.cameraFilter & camera.id)) || childAlpha === 0);

    if (!skeleton || !willRender)
    {
        //  If there is already a batch running, and the next type isn't a Spine object, or this is the end, we need to close it

        if (sceneRenderer.batcher.isDrawing && (!renderer.nextTypeMatch || renderer.finalType))
        {
            //  The next object in the display list is not a Spine object, so we end the batch
            sceneRenderer.end();

            renderer.pipelines.rebind();
        }

        if (!renderer.finalType)
        {
            //  Reset the current type
            renderer.currentType = '';
        }

        return;
    }

    if (renderer.newType)
    {
        //  flush + clear previous pipeline if this is a new type
        renderer.pipelines.clear();
    }

    var calcMatrix = GetCalcMatrix(src, camera, parentMatrix).calc;

    var viewportHeight = renderer.height;

    skeleton.x = calcMatrix.tx;
    skeleton.y = viewportHeight - calcMatrix.ty;

    skeleton.scaleX = calcMatrix.scaleX;
    skeleton.scaleY = calcMatrix.scaleY;

    if (src.scaleX < 0)
    {
        skeleton.scaleX *= -1;

        //  -180 degrees to account for the difference in Spine vs. Phaser rotation when inversely scaled
        src.root.rotation = Wrap(RadToDeg(calcMatrix.rotationNormalized) - 180, 0, 360);
    }
    else
    {
        //  +90 degrees to account for the difference in Spine vs. Phaser rotation
        src.root.rotation = Wrap(RadToDeg(CounterClockwise(calcMatrix.rotationNormalized)) + 90, 0, 360);
    }

    if (src.scaleY < 0)
    {
        skeleton.scaleY *= -1;

        if (src.scaleX < 0)
        {
            src.root.rotation -= (RadToDeg(calcMatrix.rotationNormalized) * 2);
        }
        else
        {
            src.root.rotation += (RadToDeg(calcMatrix.rotationNormalized) * 2);
        }
    }

    if (camera.renderToTexture || renderer.currentFramebuffer !== null)
    {
        skeleton.y = calcMatrix.ty;
        skeleton.scaleY *= -1;
    }

    //  Add autoUpdate option
    skeleton.updateWorldTransform();

    if (renderer.newType)
    {
        sceneRenderer.begin();
    }

    //  Draw the current skeleton
    sceneRenderer.drawSkeleton(skeleton, src.preMultipliedAlpha);

    if (plugin.drawDebug || src.drawDebug)
    {
        //  Because if we don't, the bones render positions are completely wrong (*sigh*)
        var oldX = skeleton.x;
        var oldY = skeleton.y;

        skeleton.x = 0;
        skeleton.y = 0;

        sceneRenderer.drawSkeletonDebug(skeleton, src.preMultipliedAlpha);

        skeleton.x = oldX;
        skeleton.y = oldY;
    }

    if (!renderer.nextTypeMatch)
    {
        //  The next object in the display list is not a Spine Game Object or Spine Container, so we end the batch
        sceneRenderer.end();

        //  And rebind the previous pipeline
        renderer.pipelines.rebind();
    }
};

module.exports = SpineGameObjectWebGLRenderer;
