cmake_minimum_required(VERSION 3.22.1)

project(bigdrops_local_ai LANGUAGES C CXX)

include(FetchContent)

set(LLAMA_CPP_REPOSITORY "https://github.com/ggml-org/llama.cpp.git")
set(LLAMA_CPP_COMMIT "4da6337767f973e2b4d0797e5b323d77d8565e4a")

set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_CURL OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    llama_cpp
    GIT_REPOSITORY ${LLAMA_CPP_REPOSITORY}
    GIT_TAG ${LLAMA_CPP_COMMIT}
    GIT_SHALLOW FALSE
)
FetchContent_MakeAvailable(llama_cpp)

add_library(bigdrops_local_ai SHARED local_ai_jni.cpp)

target_compile_features(bigdrops_local_ai PRIVATE cxx_std_17)

target_link_libraries(
    bigdrops_local_ai
    PRIVATE
        llama
        android
        log
)
