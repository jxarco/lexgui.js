#pragma once

#include <vector>
#include <array>
#include "includes.h"
#include "dawnxr/dawnxr.h"
#include "framework/input_xr.h"

struct WebGPUContext;

class Transform;

enum XR_BUTTONS {
    XR_BUTTON_A = 0,
    XR_BUTTON_B,
    XR_BUTTON_X,
    XR_BUTTON_Y,
    XR_BUTTON_MENU,
    XR_BUTTON_COUNT,
};

enum XR_THUMBSTICK_AXIS : uint8_t {
    XR_THUMBSTICK_NO_AXIS = 0,
    XR_THUMBSTICK_AXIS_X,
    XR_THUMBSTICK_AXIS_Y
};

struct OpenXRContext {

    Transform* root_transform = nullptr;

    /*
    * XR General
    */

    XrInstance instance = XR_NULL_HANDLE;
    XrSystemId system_id;
    // Play space is usually local (head is origin, seated) or stage (room scale)
    XrSpace play_space;
    bool initialized = false;

    bool init(WebGPUContext* webgpu_context);
    void clean();
    bool create_instance();
    XrInstance* get_instance() { return &instance; }

    /*
    * XR Input
    */

    sInputState input_state;

    void init_actions(XrInputData& data);
    void poll_actions(XrInputData& data);

    void apply_haptics(uint8_t controller, float amplitude, float duration);
    void stop_haptics(uint8_t controller);

    /*
    * Render
    */

    uint32_t view_count;
    XrFrameState frame_state{ XR_TYPE_FRAME_STATE };
    uint32_t swapchain_length; // Number of textures per swapchain

    // inverted for reverse-z
    float z_near = 1000.0f;
    float z_far = 0.01f;

    std::vector<sSwapchainData> swapchains;

    void update();

private:
    
    bool create_action(XrActionSet actionSet,
        XrPath* paths,
        uint32_t num_paths,
        const std::string& actionName,
        const std::string& localizedActionName,
        XrActionType type,
        XrAction& action);

    XrActionStatePose get_action_pose_state(XrAction targetAction, uint8_t controller);
};